# plots.R
library(jsonlite)

# Capturar y mostrar errores
tryCatch({
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) != 2) {
    stop("Se requieren exactamente 2 argumentos: data_type e input_file")
  }
  data_type <- args[1]
  input_file <- args[2]

  # Leer datos desde el archivo JSON con manejo de errores
  data <- tryCatch({
    fromJSON(input_file)
  }, error = function(e) {
    stop(paste("Error al leer el archivo JSON:", e$message))
  })

  # Verificar que data sea una lista válida
  if (!is.list(data) || length(data) == 0) {
    stop("Los datos cargados no son una lista válida o están vacíos")
  }

  # Función auxiliar para manejar valores nulos o NA
  `%||%` <- function(a, b) if (is.null(a) || is.na(a)) b else a

  if (data_type == "user") {
    user_totals <- sapply(data, function(u) {
      progress <- u$progress
      if (is.null(progress) || !is.list(progress)) 0 else sum(unlist(progress), na.rm = TRUE)
    })
    user_names <- sapply(data, function(u) u$nombre %||% "Desconocido")
    output <- list(
      x = user_names,
      y = as.numeric(user_totals),
      marker = list(color = sample(c('#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'), length(user_names), replace = TRUE))
    )
    write_json(output, "src/data/user_progress.json", auto_unbox = TRUE)
  } else if (data_type == "vocal") {
    progress_matrix <- do.call(rbind, lapply(data, function(u) {
      progress <- u$progress
      if (is.null(progress) || !is.list(progress)) c(0, 0, 0, 0, 0) else c(progress$a %||% 0, progress$e %||% 0, progress$i %||% 0, progress$o %||% 0, progress$u %||% 0)
    }))
    vocal_totals <- colMeans(progress_matrix, na.rm = TRUE)
    output <- list(
      x = c("a", "e", "i", "o", "u"),
      y = as.numeric(vocal_totals),
      marker = list(color = c('#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'))
    )
    write_json(output, "src/data/vocal_progress.json", auto_unbox = TRUE)
  } else {
    stop("Tipo de dato no reconocido: debe ser 'user' o 'vocal'")
  }
}, error = function(e) {
  cat("Error en el script R:", e$message, "\n")
  quit(save = "no", status = 1)
})