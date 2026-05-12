---
title: "Mejoras de SEO, rendimiento y seguridad"
description: "Sitemap dinámico, ThemeToggle nativo sin React, cálculo de tiempo de lectura más preciso y mejoras en los metadatos Open Graph."
date: 2026-05-12
author: "Hugo Cayón Laso"
type: "improvement"
---

## Sitemap dinámico

Se añadió un `sitemap.xml` generado en tiempo de compilación que incluye todos los posts y páginas publicadas del blog. Esto mejora la indexación en motores de búsqueda y garantiza que el contenido nuevo aparezca correctamente en los mapas de rastreo.

## ThemeToggle sin React

El componente de cambio de tema pasó de estar implementado en React a Astro puro. Al eliminar la hidratación en el cliente, la página carga menos JavaScript y el botón responde desde el primer frame sin esperar a que React se inicialice.

## Tiempo de lectura más preciso

El algoritmo de cálculo de tiempo de lectura ahora excluye del conteo de palabras los bloques de código, imágenes y enlaces. El resultado es una estimación más fiel al tiempo real que dedica el lector al texto.

## Metadatos Open Graph para artículos

Los posts incluyen ahora metadatos adicionales en el `<head>` para mejorar cómo se ven al compartirse en redes sociales:

- `article:published_time` — fecha de publicación
- `article:author` — nombre del autor
- `article:tag` — etiquetas del artículo

## robots.txt actualizado

Se ajustaron las directivas del fichero `robots.txt` para permitir un rastreo más completo por parte de los motores de búsqueda, asegurando que el sitemap sea accesible y que no se bloqueen rutas relevantes.
