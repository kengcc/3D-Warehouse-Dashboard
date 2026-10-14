# Prompts used to build 3D Warehouse Dashboard

These are the six original prompts used to build WareTrack, preserved verbatim and ordered by development stage. They show how to guide an AI coding assistant from a visual concept through a data model, a working scene, live interactions, operational controls, and an engineering review.

Use them in sequence in the same project conversation so each stage can build on the existing files. Generate the concept image first, then attach it when a later prompt refers to the image.

| Step | Prompt | Focus |
| --- | --- | --- |
| 1 | [Concept image](01-concept-image.md) | Establish the visual direction |
| 2 | [Data layer](02-data-layer.md) | Define entities and seed data before building the UI |
| 3 | [3D warehouse scene](03-warehouse-scene.md) | Render the existing data and constrain camera movement |
| 4 | [Selection and live status](04-selection-and-live-status.md) | Connect object interaction to a separate state store |
| 5 | [Site navigation, KPIs, and filters](05-kpis-and-filters.md) | Add operational information computed from the store |
| 6 | [Engineering review](06-engineering-review.md) | Find and fix problems, optimize repeated geometry, and verify results |

The sequence makes each request concrete, limits the scope of each step, preserves earlier work, and names the checks expected before completion. When adapting these prompts, define KPI semantics explicitly and measure frame rates on the target hardware.
