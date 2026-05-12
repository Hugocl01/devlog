---
title: "Correcciones: animación del ScrollToTop y tabla de contenidos"
description: "Se corrige la animación de aparición y desaparición del botón de volver arriba, y se añaden encabezados al post de bienvenida para activar el TOC."
date: 2026-05-12
author: "Hugo Cayón Laso"
type: "bugfix"
---

## Animación del botón "volver arriba"

El botón de volver arriba aparecía y desaparecía sin animación visible a pesar de tener definida una transición. El problema era que la clase `modern-scale-sm` declaraba `transition: transform` después de `modern-hover`, sobreescribiendo la transición y dejando `opacity` sin animar.

La solución fue mover la transición a un atributo `style` inline, que tiene prioridad sobre cualquier clase CSS, cubriendo tanto `opacity` como `transform` con el easing del proyecto (`var(--ease-modern)`). Ahora tanto la aparición como la desaparición se animan correctamente en ambas direcciones.

Además, el listener de scroll ahora usa `{ passive: true }` para no bloquear el hilo principal durante el desplazamiento, mejorando el rendimiento de la página en dispositivos lentos.

## Tabla de contenidos en el post de bienvenida

El primer post del blog no tenía ningún encabezado `H2` ni `H3`, por lo que la tabla de contenidos lateral nunca aparecía. Se reestructuró el contenido añadiendo secciones con título para activar el TOC correctamente.
