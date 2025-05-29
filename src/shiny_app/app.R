library(shiny)
library(httr)
library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)
library(websocket)
library(DT)

# Operador %||% para manejar valores NULL
`%||%` <- function(a, b) if (!is.null(a)) a else b

# Función para obtener datos del endpoint
fetch_progress_data <- function() {
  tryCatch({
    response <- GET("http://localhost:3000/api/progress")
    if (http_status(response)$category != "Success") {
      message("Error en la solicitud HTTP: ", http_status(response)$message)
      return(NULL)
    }
    data <- fromJSON(rawToChar(response$content))
    print("Datos devueltos por /api/progress:")
    print(str(data))  # Usar str() para inspeccionar la estructura de los datos
    if (is.null(data) || length(data) == 0) {
      message("No se recibieron datos válidos")
      return(NULL)
    }
    # Convertir a data frame y asegurar que userId sea una cadena
    data <- as.data.frame(data, stringsAsFactors = FALSE)
    if (nrow(data) == 0) {
      message("No hay filas en los datos")
      return(NULL)
    }
    # Asegurarse de que userId sea una cadena y manejar valores nulos
    if ("userId" %in% names(data)) {
      data$userId <- ifelse(is.na(data$userId) | is.null(data$userId), "N/A", as.character(data$userId))
    }
    # Desanidar la columna progress para la tabla
    if ("progress" %in% names(data)) {
      progress_df <- data$progress %>%
        bind_rows() %>%
        mutate_all(~replace(., is.na(.), 0)) %>%
        rename_with(~paste0("progress.", .), everything())
      # Asegurarse de que todas las columnas progress.* existan
      required_cols <- c("progress.a", "progress.e", "progress.i", "progress.o", "progress.u")
      for (col in required_cols) {
        if (!(col %in% names(progress_df))) {
          progress_df[[col]] <- 0
        }
      }
      # Combinar con el data frame original
      data <- cbind(data[, !names(data) %in% "progress", drop = FALSE], progress_df)
    } else {
      # Si no hay columna progress, crearlas con valor 0
      for (col in c("progress.a", "progress.e", "progress.i", "progress.o", "progress.u")) {
        data[[col]] <- 0
      }
    }
    return(data)
  }, error = function(e) {
    message("Error al obtener datos: ", e)
    return(NULL)
  })
}

ui <- fluidPage(
  titlePanel("Panel de Administración Interactivo"),
  sidebarLayout(
    sidebarPanel(
      h4("Filtros"),
      selectInput("userFilter", "Filtrar por Nombre:", choices = "Todos"),
      selectInput("vocalFilter", "Filtrar por Vocal:", choices = c("Todas", "a", "e", "i", "o", "u")),
      actionButton("deleteUserBtn", "Eliminar Usuario Seleccionado"),
      h4("Editar Progreso"),
      uiOutput("editUserControls"),
      actionButton("saveProgressBtn", "Guardar Progreso")
    ),
    mainPanel(
      h3("Lista de Usuarios"),
      DTOutput("userTable"),
      h3("Detalles Gráficos"),
      plotOutput("userDetailPlot", height = "300px"),
      plotOutput("vocalDetailPlot", height = "300px"),
      h3("Progreso Promedio por Vocal"),
      plotOutput("averageProgressPlot"),
      h3("Progreso Individual por Usuario"),
      plotOutput("individualProgressPlot", height = "600px")
    )
  )
)

server <- function(input, output, session) {
  rv <- reactiveValues(trigger = 0, selectedUser = NULL, userProgress = list())

  # Conectar a WebSocket
  ws <- WebSocket$new("ws://localhost:8080")
  ws$onOpen(function(event) {
    print("🟢 Conexión WebSocket abierta")
  })
  ws$onMessage(function(event) {
    print("🟢 Mensaje WebSocket recibido")
    rv$trigger <- rv$trigger + 1
  })
  ws$onError(function(event) {
    print("❌ Error en WebSocket")
  })
  ws$onClose(function(event) {
    print("🟡 Conexión WebSocket cerrada")
  })

  # Obtener datos cuando se activa el trigger
  progressData <- reactive({
    rv$trigger
    fetch_progress_data()
  })

  # Seleccionar la fuente de datos
  dataSource <- reactive({
    data <- progressData()
    data
  })

  # Actualizar opciones de filtro dinámicamente
  observe({
    data <- dataSource()
    if (!is.null(data) && is.data.frame(data) && nrow(data) > 0) {
      names <- unique(data$nombre)
      names <- names[!is.na(names)]
      updateSelectInput(session, "userFilter", choices = c("Todos", names))
    } else {
      updateSelectInput(session, "userFilter", choices = "Todos")
    }
  })

  # Reactive para los datos filtrados
  filteredData <- reactive({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(NULL)
    }

    filtered_data <- data
    if (input$userFilter != "Todos") {
      filtered_data <- filtered_data[filtered_data$nombre == input$userFilter, , drop = FALSE]
    }
    if (input$vocalFilter != "Todas") {
      vocal <- paste0("progress.", input$vocalFilter)
      if (vocal %in% names(filtered_data)) {
        filtered_data <- filtered_data[filtered_data[[vocal]] > 0, , drop = FALSE]
      }
    }

    filtered_data
  })

  # Tabla de usuarios
  output$userTable <- renderDT({
    filtered_data <- filteredData()
    if (is.null(filtered_data) || nrow(filtered_data) == 0) {
      return(DT::datatable(data.frame()))
    }

    dt_data <- data.frame(
      Nombre = filtered_data$nombre %||% "N/A",
      Email = filtered_data$email %||% "N/A",
      UserId = as.character(filtered_data$userId %||% "N/A"),  # Forzar a cadena
      Progreso_A = filtered_data$progress.a %||% 0,
      Progreso_E = filtered_data$progress.e %||% 0,
      Progreso_I = filtered_data$progress.i %||% 0,
      Progreso_O = filtered_data$progress.o %||% 0,
      Progreso_U = filtered_data$progress.u %||% 0,
      stringsAsFactors = FALSE
    )
    DT::datatable(dt_data, selection = 'single', options = list(pageLength = 5))
  })

  # Actualizar selectedUser cuando se seleccione una fila
  observeEvent(input$userTable_rows_selected, {
    selected_row <- input$userTable_rows_selected
    print("Fila seleccionada en DT:", selected_row)  # Depuración
    if (length(selected_row) > 0) {
      filtered_data <- filteredData()
      if (is.null(filtered_data) || nrow(filtered_data) == 0) {
        rv$selectedUser <- NULL
        rv$userProgress <- list()
        return()
      }

      # Obtener el userId directamente de la tabla renderizada
      dt_data <- data.frame(
        Nombre = filtered_data$nombre %||% "N/A",
        Email = filtered_data$email %||% "N/A",
        UserId = as.character(filtered_data$userId %||% "N/A"),  # Forzar a cadena
        Progreso_A = filtered_data$progress.a %||% 0,
        Progreso_E = filtered_data$progress.e %||% 0,
        Progreso_I = filtered_data$progress.i %||% 0,
        Progreso_O = filtered_data$progress.o %||% 0,
        Progreso_U = filtered_data$progress.u %||% 0,
        stringsAsFactors = FALSE
      )
      # Imprimir UserId de forma segura para evitar coerción
      cat("Columna UserId de la tabla renderizada:\n")
      cat(paste(dt_data$UserId, collapse = ", "), "\n")
      cat("Valor de UserId en la fila seleccionada: ", dt_data$UserId[selected_row], "\n")

      if (selected_row > 0 && selected_row <= nrow(dt_data)) {
        selected_user_id <- dt_data$UserId[selected_row]
        if (!is.na(selected_user_id) && selected_user_id != "N/A") {
          rv$selectedUser <- as.character(selected_user_id)
          cat("Usuario seleccionado: ", rv$selectedUser, "\n")
          # Cargar el progreso actual del usuario seleccionado
          user_data <- filtered_data[filtered_data$userId == rv$selectedUser, , drop = FALSE]
          if (nrow(user_data) > 0) {
            progress <- user_data[1, c("progress.a", "progress.e", "progress.i", "progress.o", "progress.u")]
            rv$userProgress <- as.list(progress)
          } else {
            rv$userProgress <- list()
          }
        } else {
          cat("UserId inválido en la fila seleccionada: ", selected_user_id, "\n")
          rv$selectedUser <- NULL
          rv$userProgress <- list()
        }
      } else {
        cat("Índice de fila inválido: ", selected_row, "\n")
        rv$selectedUser <- NULL
        rv$userProgress <- list()
      }
    } else {
      rv$selectedUser <- NULL
      rv$userProgress <- list()
    }
  })

  # Generar controles para editar progreso
  output$editUserControls <- renderUI({
    if (!is.null(rv$selectedUser)) {
      tagList(
        h5("Editar Progreso para ", rv$selectedUser),
        p("Ingresa el nuevo progreso para cada vocal:"),
        numericInput("progressA", "A:", value = rv$userProgress$progress.a %||% 0, min = 0),
        numericInput("progressE", "E:", value = rv$userProgress$progress.e %||% 0, min = 0),
        numericInput("progressI", "I:", value = rv$userProgress$progress.i %||% 0, min = 0),
        numericInput("progressO", "O:", value = rv$userProgress$progress.o %||% 0, min = 0),
        numericInput("progressU", "U:", value = rv$userProgress$progress.u %||% 0, min = 0)
      )
    } else {
      p("Selecciona un usuario en la tabla para editar su progreso.")
    }
  })

  # Acción para eliminar usuario
  observeEvent(input$deleteUserBtn, {
    if (!is.null(rv$selectedUser)) {
      cat("Eliminando usuario con ID: ", rv$selectedUser, "\n")
      response <- httr::POST("http://localhost:3000/api/delete-user",
                             body = list(userId = rv$selectedUser),
                             encode = "json")
      cat("Respuesta de eliminación: ", response, "\n")
      if (http_status(response)$category == "Success") {
        showNotification("Usuario eliminado con éxito", type = "message")
        rv$trigger <- rv$trigger + 1
        rv$selectedUser <- NULL
        rv$userProgress <- list()
      } else {
        showNotification("Error al eliminar usuario", type = "error")
      }
    } else {
      showNotification("Por favor selecciona un usuario en la tabla", type = "warning")
    }
  })

  # Acción para guardar progreso
  observeEvent(input$saveProgressBtn, {
    if (!is.null(rv$selectedUser)) {
      progress <- list(
        a = as.integer(input$progressA),
        e = as.integer(input$progressE),
        i = as.integer(input$progressI),
        o = as.integer(input$progressO),
        u = as.integer(input$progressU)
      )
      cat("Guardando progreso para usuario: ", rv$selectedUser, "\n")
      cat("Progreso enviado: ", progress, "\n")
      response <- httr::POST("http://localhost:3000/api/update-user-progress",
                             body = list(userId = rv$selectedUser, progress = progress),
                             encode = "json")
      cat("Respuesta de actualización: ", response, "\n")
      if (http_status(response)$category == "Success") {
        showNotification("Progreso actualizado con éxito", type = "message")
        rv$trigger <- rv$trigger + 1
        # Actualizar rv$userProgress con los nuevos valores
        rv$userProgress <- progress
      } else {
        showNotification("Error al actualizar progreso", type = "error")
      }
    } else {
      showNotification("Por favor selecciona un usuario en la tabla", type = "warning")
    }
  })

  # Gráfico de detalles del usuario seleccionado
  output$userDetailPlot <- renderPlot({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0 || is.null(rv$selectedUser)) {
      return(ggplot() + ggtitle("Selecciona un usuario para ver detalles"))
    }

    user_data <- data[data$userId == rv$selectedUser, , drop = FALSE]
    cat("Datos del usuario seleccionado para userDetailPlot:\n")
    print(user_data)
    if (nrow(user_data) == 0) {
      return(ggplot() + ggtitle("Usuario no encontrado"))
    }

    progress_long <- data.frame(
      Vocal = c("A", "E", "I", "O", "U"),
      Progreso = c(user_data$progress.a[1], user_data$progress.e[1], user_data$progress.i[1], user_data$progress.o[1], user_data$progress.u[1])
    )

    ggplot(progress_long, aes(x = Vocal, y = Progreso, fill = Vocal)) +
      geom_bar(stat = "identity") +
      theme_minimal() +
      labs(title = paste("Progreso de", user_data$nombre[1]), y = "Progreso", x = "Vocal") +
      scale_fill_manual(values = c("A" = "#FF6F61", "E" = "#6B5B95", "I" = "#88B04B", "O" = "#F7CAC9", "U" = "#92A8D1"))
  })

  # Gráfico de detalles de la vocal seleccionada
  output$vocalDetailPlot <- renderPlot({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0 || input$vocalFilter == "Todas") {
      return(ggplot() + ggtitle("Selecciona una vocal para ver detalles"))
    }

    vocal <- paste0("progress.", input$vocalFilter)
    if (vocal %in% names(data)) {
      filtered_data <- data[data[[vocal]] > 0, , drop = FALSE]
      if (nrow(filtered_data) == 0) {
        return(ggplot() + ggtitle(paste("No hay progreso para la vocal", input$vocalFilter)))
      }

      progress_long <- data.frame(
        Nombre = filtered_data$nombre,
        Progreso = filtered_data[[vocal]]
      )

      ggplot(progress_long, aes(x = Nombre, y = Progreso, fill = Nombre)) +
        geom_bar(stat = "identity") +
        theme_minimal() +
        labs(title = paste("Progreso para vocal", toupper(input$vocalFilter)), y = "Progreso", x = "Usuario") +
        theme(axis.text.x = element_text(angle = 45, hjust = 1)) +
        scale_fill_manual(values = rainbow(nrow(progress_long)))
    } else {
      return(ggplot() + ggtitle("Vocal no válida"))
    }
  })

  # Gráfico de progreso promedio por vocal
  output$averageProgressPlot <- renderPlot({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    averages <- data %>%
      summarise(
        a = mean(progress.a, na.rm = TRUE),
        e = mean(progress.e, na.rm = TRUE),
        i = mean(progress.i, na.rm = TRUE),
        o = mean(progress.o, na.rm = TRUE),
        u = mean(progress.u, na.rm = TRUE)
      ) %>%
      pivot_longer(cols = everything(), names_to = "Vocal", values_to = "Progreso")

    ggplot(averages, aes(x = Vocal, y = Progreso, fill = Vocal)) +
      geom_bar(stat = "identity") +
      theme_minimal() +
      labs(title = "Progreso Promedio por Vocal", y = "Progreso Promedio", x = "Vocal") +
      scale_fill_manual(values = c("a" = "#FF6F61", "e" = "#6B5B95", "i" = "#88B04B", "o" = "#F7CAC9", "u" = "#92A8D1"))
  })

  # Gráfico de progreso individual
  output$individualProgressPlot <- renderPlot({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    progress_long <- data %>%
      select(nombre, progress.a, progress.e, progress.i, progress.o, progress.u) %>%
      rename(a = progress.a, e = progress.e, i = progress.i, o = progress.o, u = progress.u) %>%
      pivot_longer(cols = -nombre, names_to = "Vocal", values_to = "Progreso")

    ggplot(progress_long, aes(x = Vocal, y = Progreso, fill = Vocal)) +
      geom_bar(stat = "identity") +
      facet_wrap(~nombre, ncol = 2) +
      theme_minimal() +
      labs(title = "Progreso Individual por Usuario", y = "Progreso", x = "Vocal") +
      scale_fill_manual(values = c("a" = "#FF6F61", "e" = "#6B5B95", "i" = "#88B04B", "o" = "#F7CAC9", "u" = "#92A8D1"))
  })

  # Asegurarse de cerrar WebSocket al finalizar la sesión
  onSessionEnded(function() {
    ws$close()
  })
}

# Crear y devolver explícitamente el objeto shiny.appobj
app <- shinyApp(ui = ui, server = server)
app