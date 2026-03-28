/**
 * =============================================================
 * ARCHIVO DE CONTENIDO: current-trivia.js
 * =============================================================
 *
 * PROPÓSITO:
 *   Este archivo define el contenido completo de la trivia activa.
 *   El motor del juego (game.js) lee window.TRIVIA_DATA al iniciar.
 *   Para crear una nueva trivia, SOLO debes modificar este archivo.
 *   No es necesario tocar index.html ni game.js.
 *
 * REGLA PRINCIPAL:
 *   El contenido cambia. El motor del juego no.
 *
 * CÓMO EDITAR ESTE ARCHIVO (instrucciones para un LLM):
 *   1. Cambia "meta.title" y "meta.theme" para describir la nueva trivia.
 *   2. Edita el array "cards" reemplazando preguntas y desafíos.
 *   3. Mantén exactamente 20 tarjetas: 10 con "team": "red" y 10 con "team": "blue".
 *   4. Los IDs deben ser únicos, del 1 al 20, sin repetir.
 *   5. NO modifiques "settings", "teams" ni la línea window.TRIVIA_DATA.
 *   6. NO agregues campos de estado como "used", "score", "locked", etc.
 *
 * TIPOS DE TARJETA VÁLIDOS:
 *
 *   A) multiple_choice — Pregunta de selección múltiple:
 *      {
 *        "id": <número único>,
 *        "team": "red" | "blue",
 *        "type": "multiple_choice",
 *        "question": "<texto de la pregunta>",
 *        "options": ["<opción A>", "<opción B>", "<opción C>", "<opción D>"],
 *        "correctAnswerIndex": <0 | 1 | 2 | 3>   ← índice de la opción correcta (base 0)
 *      }
 *
 *   B) challenge — Desafío rápido con contador de tiempo:
 *      {
 *        "id": <número único>,
 *        "team": "red" | "blue",
 *        "type": "challenge",
 *        "prompt": "<texto del desafío>",
 *        "seconds": <número>    ← duración del contador (recomendado: 5)
 *      }
 *
 * DISTRIBUCIÓN RECOMENDADA DE TARJETAS:
 *   - Alterna entre preguntas y desafíos para mantener el ritmo del juego.
 *   - Sugerencia: 5 preguntas + 5 desafíos por equipo (10 por equipo, 20 en total).
 *
 * VALIDACIONES QUE HACE EL MOTOR AUTOMÁTICAMENTE:
 *   ✓ Exactamente 20 tarjetas en total
 *   ✓ Exactamente 10 rojas y 10 azules
 *   ✓ IDs únicos y sin repetir
 *   ✓ Cada pregunta tiene exactamente 4 opciones
 *   ✓ correctAnswerIndex entre 0 y 3
 *   ✓ Cada tarjeta tiene los campos requeridos según su tipo
 *   Si algo falla, el juego muestra un error y no inicia.
 *
 * =============================================================
 */

window.TRIVIA_DATA = {

    // ─── METADATOS ───────────────────────────────────────────
    // Edita title y theme para describir la nueva trivia.
    // Incrementa version cada vez que actualices el contenido.
    "meta": {
        "title": "Trivia de Cultura y Humanidades",
        "theme": "Conocimiento General",
        "version": 1
    },

    // ─── CONFIGURACIÓN ───────────────────────────────────────
    // NO modificar estos valores salvo que cambies las reglas del juego.
    // startingTeam: equipo que comienza ("red" siempre según las reglas).
    // defaultChallengeSeconds: segundos del contador cuando una tarjeta
    //   de desafío no define su propio campo "seconds".
    "settings": {
        "startingTeam": "red",
        "defaultChallengeSeconds": 10,
        "totalCards": 20,
        "cardsPerTeam": 10
    },

    // ─── EQUIPOS ─────────────────────────────────────────────
    // NO modificar. Define los dos equipos del juego.
    "teams": [
        { "id": "red", "name": "Equipo Rojo", "color": "red" },
        { "id": "blue", "name": "Equipo Azul", "color": "blue" }
    ],

    // ─── TARJETAS ────────────────────────────────────────────
    // AQUÍ ES DONDE DEBES HACER LOS CAMBIOS para una nueva trivia.
    //
    // Orden sugerido: id 1–10 para el equipo rojo, id 11–20 para el azul.
    // Alterna tipos (multiple_choice / challenge) para variar el ritmo.
    //
    // Cada tarjeta ocupa una celda en el tablero 5×4.
    // El moderador ve el icono ❓ para preguntas y ⚡ para desafíos.
    "cards": [

        // ── TARJETAS ROJAS (team: "red") — IDs del 1 al 10 ──

        // Tarjeta 1 · Rojo · Pregunta
        {
            "id": 1,
            "team": "red",
            "type": "multiple_choice",
            "question": "¿Quién escribió la obra 'Don Quijote de la Mancha'?",
            "options": [
                "Federico García Lorca",
                "Miguel de Cervantes",
                "Pablo Neruda",
                "Lope de Vega"
            ],
            "correctAnswerIndex": 1
        },

        // Tarjeta 2 · Rojo · Desafío
        {
            "id": 2,
            "team": "red",
            "type": "challenge",
            "prompt": "Menciona 4 filósofos famosos de la historia.",
            "seconds": 10
        },

        // Tarjeta 3 · Rojo · Pregunta
        {
            "id": 3,
            "team": "red",
            "type": "multiple_choice",
            "question": "¿En qué país se originó el Renacimiento?",
            "options": [
                "Francia",
                "Alemania",
                "Italia",
                "Grecia"
            ],
            "correctAnswerIndex": 2
        },

        // Tarjeta 4 · Rojo · Desafío
        {
            "id": 4,
            "team": "red",
            "type": "challenge",
            "prompt": "Menciona 4 géneros literarios.",
            "seconds": 10
        },

        // Tarjeta 5 · Rojo · Pregunta
        {
            "id": 5,
            "team": "red",
            "type": "multiple_choice",
            "question": "¿Cuál de estas obras fue escrita por William Shakespeare?",
            "options": [
                "La Odisea",
                "Hamlet",
                "La Divina Comedia",
                "Cien años de soledad"
            ],
            "correctAnswerIndex": 1
        },

        // Tarjeta 6 · Rojo · Desafío
        {
            "id": 6,
            "team": "red",
            "type": "challenge",
            "prompt": "Menciona 4 países de Europa.",
            "seconds": 10
        },

        // Tarjeta 7 · Rojo · Pregunta
        {
            "id": 7,
            "team": "red",
            "type": "multiple_choice",
            "question": "¿Qué disciplina estudia los hechos del pasado humano?",
            "options": [
                "Biología",
                "Geometría",
                "Historia",
                "Astronomía"
            ],
            "correctAnswerIndex": 2
        },

        // Tarjeta 8 · Rojo · Desafío
        {
            "id": 8,
            "team": "red",
            "type": "challenge",
            "prompt": "Menciona 4 idiomas hablados en el mundo.",
            "seconds": 10
        },

        // Tarjeta 9 · Rojo · Pregunta
        {
            "id": 9,
            "team": "red",
            "type": "multiple_choice",
            "question": "¿Quién pintó la Mona Lisa?",
            "options": [
                "Vincent van Gogh",
                "Pablo Picasso",
                "Leonardo da Vinci",
                "Claude Monet"
            ],
            "correctAnswerIndex": 2
        },

        // Tarjeta 10 · Rojo · Desafío
        {
            "id": 10,
            "team": "red",
            "type": "challenge",
            "prompt": "Menciona 4 civilizaciones antiguas.",
            "seconds": 10
        },

        // ── TARJETAS AZULES (team: "blue") — IDs del 11 al 20 ──

        // Tarjeta 11 · Azul · Pregunta
        {
            "id": 11,
            "team": "blue",
            "type": "multiple_choice",
            "question": "¿Qué poeta chileno ganó el Premio Nobel de Literatura en 1971?",
            "options": [
                "Gabriela Mistral",
                "Pablo Neruda",
                "Nicanor Parra",
                "Vicente Huidobro"
            ],
            "correctAnswerIndex": 1
        },

        // Tarjeta 12 · Azul · Desafío
        {
            "id": 12,
            "team": "blue",
            "type": "challenge",
            "prompt": "Menciona 4 museos famosos del mundo.",
            "seconds": 10
        },

        // Tarjeta 13 · Azul · Pregunta
        {
            "id": 13,
            "team": "blue",
            "type": "multiple_choice",
            "question": "¿Cuál es la capital de Egipto?",
            "options": [
                "El Cairo",
                "Alejandría",
                "Luxor",
                "Casablanca"
            ],
            "correctAnswerIndex": 0
        },

        // Tarjeta 14 · Azul · Desafío
        {
            "id": 14,
            "team": "blue",
            "type": "challenge",
            "prompt": "Menciona 4 libros clásicos de la literatura.",
            "seconds": 10
        },

        // Tarjeta 15 · Azul · Pregunta
        {
            "id": 15,
            "team": "blue",
            "type": "multiple_choice",
            "question": "¿Cuál de estas disciplinas pertenece a las humanidades?",
            "options": [
                "Filosofía",
                "Química",
                "Física",
                "Ingeniería"
            ],
            "correctAnswerIndex": 0
        },

        // Tarjeta 16 · Azul · Desafío
        {
            "id": 16,
            "team": "blue",
            "type": "challenge",
            "prompt": "Menciona 4 pintores famosos.",
            "seconds": 8
        },

        // Tarjeta 17 · Azul · Pregunta
        {
            "id": 17,
            "team": "blue",
            "type": "multiple_choice",
            "question": "¿Quién escribió 'La Ilíada' y 'La Odisea', según la tradición?",
            "options": [
                "Sófocles",
                "Platón",
                "Homero",
                "Aristóteles"
            ],
            "correctAnswerIndex": 2
        },

        // Tarjeta 18 · Azul · Desafío
        {
            "id": 18,
            "team": "blue",
            "type": "challenge",
            "prompt": "Menciona 4 ramas del arte.",
            "seconds": 10
        },

        // Tarjeta 19 · Azul · Pregunta
        {
            "id": 19,
            "team": "blue",
            "type": "multiple_choice",
            "question": "¿Qué movimiento artístico está asociado con Salvador Dalí?",
            "options": [
                "Impresionismo",
                "Barroco",
                "Surrealismo",
                "Romanticismo"
            ],
            "correctAnswerIndex": 2
        },

        // Tarjeta 20 · Azul · Desafío
        {
            "id": 20,
            "team": "blue",
            "type": "challenge",
            "prompt": "Menciona 4 ciudades famosas por su valor histórico o cultural.",
            "seconds": 10
        }

    ] // fin de cards — debe haber exactamente 20 elementos

}; // fin de window.TRIVIA_DATA — no eliminar este punto y coma