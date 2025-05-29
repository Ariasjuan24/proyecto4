library(shiny)
library(httr)
library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr) # Añadido para pivot_longer

# Función para obtener datos del endpoint
fetch_progress_data <- function() {
  tryCatch({
    response <- GET("http://localhost:3000/api/progress")
    data <- fromJSON(rawToChar(response$content))
    return(data)
  }, error = function(e) {
    message("Error al obtener datos: ", e)
    return(NULL)
  })
}

ui <- fluidPage(
  titlePanel("Progreso de Usuarios en Tiempo Real"),
  sidebarLayout(
    sidebarPanel(
      h4("Configuración"),
      sliderInput("updateInterval", "Intervalo de actualización (segundos):",
                  min = 5, max = 60, value = 10, step = 5)
    ),
    mainPanel(
      h3("Progreso Promedio por Vocal"),
      plotOutput("averageProgressPlot"),
      h3("Progreso Individual de Usuarios"),
      plotOutput("individualProgressPlot", height = "600px")
    )
  )
)

server <- function(input, output, session) {
  # Obtener datos periódicamente
  progressData <- reactivePoll(
    intervalMillis = reactive(input$updateInterval * 1000),
    session = session,
    checkFunc = function() {
      Sys.time()
    },
    valueFunc = fetch_progress_data
  )

  # Gráfico de progreso promedio por vocal
  output$averageProgressPlot <- renderPlot({
    data <- progressData()
    if (is.null(data)) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    # Calcular promedio por vocal
    averages <- data %>%
      rowwise() %>%
      mutate(
        a = progress$a,
        e = progress$e,
        i = progress$i,
        o = progress$o,
        u = progress$u
      ) %>%
      ungroup() %>%
      summarise(
        a = mean(a, na.rm = TRUE),
        e = mean(e, na.rm = TRUE),
        i = mean(i, na.rm = TRUE),
        o = mean(o, na.rm = TRUE),
        u = mean(u, na.rm = TRUE)
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
    data <- progressData()
    if (is.null(data)) {
      return(ggplot() + ggtitle("No se pudieron obtener datos"))
    }

    # Preparar datos para el gráfico
    progress_long <- data %>%
      rowwise() %>%
      mutate(
        a = progress$a,
        e = progress$e,
        i = progress$i,
        o = progress$o,
        u = progress$u
      ) %>%
      ungroup() %>%
      select(nombre, a, e, i, o, u) %>%
      pivot_longer(cols = -nombre, names_to = "Vocal", values_to = "Progreso")

    ggplot(progress_long, aes(x = Vocal, y = Progreso, fill = Vocal)) +
      geom_bar(stat = "identity") +
      facet_wrap(~nombre, ncol = 2) +
      theme_minimal() +
      labs(title = "Progreso Individual por Usuario", y = "Progreso", x = "Vocal") +
      scale_fill_manual(values = c("a" = "#FF6F61", "e" = "#6B5B95", "i" = "#88B04B", "o" = "#F7CAC9", "u" = "#92A8D1"))
  })
}

shinyApp(ui = ui, server = server)