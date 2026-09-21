CREATE TABLE "GenerationInput" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GenerationInput_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GenerationInput_generationId_uploadId_key" ON "GenerationInput"("generationId", "uploadId");
CREATE INDEX "GenerationInput_generationId_position_idx" ON "GenerationInput"("generationId", "position");

ALTER TABLE "GenerationInput" ADD CONSTRAINT "GenerationInput_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationInput" ADD CONSTRAINT "GenerationInput_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
