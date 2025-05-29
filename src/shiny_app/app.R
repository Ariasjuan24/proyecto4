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
    print(data)  # Depuración: imprime los datos para inspeccionarlos
    if (is.null(data) || length(data) == 0) {
      message("No se recibieron datos válidos")
      return(NULL)
    }
    # Convertir a data frame
    data <- as.data.frame(data)
    if (nrow(data) == 0) {
      message("No hay filas en los datos")
      return(NULL)
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
      actionButton("editProgressBtn", "Editar Progreso"),
      textInput("editUserId", "ID de Usuario a Editar:", ""),
      textInput("newProgress", "Nuevo Progreso (JSON, ej. {'a': 5, 'e': 3}):", ""),
      h4("Configuración"),
      sliderInput("updateInterval", "Intervalo de actualización (segundos):",
                  min = 5, max = 60, value = 10, step = 5)
    ),
    mainPanel(
      h3("Lista de Usuarios"),
      DTOutput("userTable"),
      h3("Progreso Promedio por Vocal"),
      plotOutput("averageProgressPlot"),
      h3("Progreso Individual por Usuario"),
      plotOutput("individualProgressPlot", height = "600px")
    )
  )
)

server <- function(input, output, session) {
  rv <- reactiveValues(trigger = 0, selectedUser = NULL)

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

  # Obtener datos periódicamente como fallback
  progressDataFallback <- reactivePoll(
    intervalMillis = reactive(input$updateInterval * 1000),
    session = session,
    checkFunc = function() {
      Sys.time()
    },
    valueFunc = fetch_progress_data
  )

  # Seleccionar la fuente de datos
  dataSource <- reactive({
    data <- progressData()
    if (is.null(data)) {
      data <- progressDataFallback()
    }
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

  # Tabla de usuarios
  output$userTable <- renderDT({
    data <- dataSource()
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(DT::datatable(data.frame()))
    }

    filtered_data <- data
    if (input$userFilter != "Todos") {
      filtered_data <- filtered_data[filtered_data$nombre == input$userFilter, ]
    }
    if (input$vocalFilter != "Todas") {
      vocal <- paste0("progress.", input$vocalFilter)
      filtered_data <- filtered_data[filtered_data[[vocal]] > 0, ]
    }

    dt_data <- data.frame(
      Nombre = filtered_data$nombre %||% "N/A",
      Email = filtered_data$email %||% "N/A",
      UserId = filtered_data$userId %||% "N/A",
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
    if (length(selected_row)) {
      data <- dataSource()
      if (is.data.frame(data) && nrow(data) >= selected_row) {
        rv$selectedUser <- data$userId[selected_row]
        updateTextInput(session, "editUserId", value = rv$selectedUser)
      }
    }
  })

  # Acción para eliminar usuario
  observeEvent(input$deleteUserBtn, {
    if (!is.null(rv$selectedUser)) {
      response <- httr::POST("http://localhost:3000/api/delete-user",
                             body = list(userId = rv$selectedUser),
                             encode = "json")
      if (http_status(response)$category == "Success") {
        showNotification("Usuario eliminado con éxito", type = "message")
        rv$trigger <- rv$trigger + 1
      } else {
        showNotification("Error al eliminar usuario", type = "error")
      }
    }
  })

  # Acción para editar progreso
  observeEvent(input$editProgressBtn, {
    if (!is.null(rv$selectedUser) && nchar(input$newProgress) > 0) {
      progress <- jsonlite::fromJSON(input$newProgress)
      response <- httr::POST("http://localhost:3000/api/update-user-progress",
                             body = list(userId = rv$selectedUser, progress = progress),
                             encode = "json")
      if (http_status(response)$category == "Success") {
        showNotification("Progreso actualizado con éxito", type = "message")
        rv$trigger <- rv$trigger + 1
      } else {
        showNotification("Error al actualizar progreso", type = "error")
      }
    }
  })

  # Gráfico de progreso promedio por vocal
  output$averageProgressPlot <- renderPlot({
    data <- dataSource()
    print("Datos para la gráfica promedio:")
    print(str(data))  # Depuración
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    # Usar las columnas desanidadas directamente
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
    print("Datos para la gráfica individual:")
    print(str(data))  # Depuración
    if (is.null(data) || !is.data.frame(data) || nrow(data) == 0) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    # Usar las columnas desanidadas directamente
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