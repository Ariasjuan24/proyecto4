library(shiny)

ui <- fluidPage(
  titlePanel("Panel de Administración con R"),
  sidebarLayout(
    sidebarPanel(
      sliderInput("bins", "Número de bins:", min = 1, max = 50, value = 30)
    ),
    mainPanel(
      plotOutput("distPlot")
    )
  )
)

server <- function(input, output) {
  output$distPlot <- renderPlot({
    x <- faithful$waiting
    bins <- seq(min(x), max(x), length.out = input$bins + 1)
    hist(x, breaks = bins, col = "#75AADB", border = "black",
         main = "Histograma de Espera (Fieles Geysers)")
  })
}

shinyApp(ui = ui, server = server)