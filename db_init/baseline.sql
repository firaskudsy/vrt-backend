-- public."Baseline" definition

-- Drop table

-- DROP TABLE public."Baseline";

CREATE TABLE public."Baseline" (
	id text NOT NULL,
	"baselineName" text NOT NULL,
	"testVariationId" text NOT NULL,
	"testRunId" text NULL,
	"userId" text NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "Baseline_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "Baseline_testRunId_key" ON public."Baseline" USING btree ("testRunId");


-- public."Baseline" foreign keys

ALTER TABLE public."Baseline" ADD CONSTRAINT "Baseline_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES public."TestRun"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public."Baseline" ADD CONSTRAINT "Baseline_testVariationId_fkey" FOREIGN KEY ("testVariationId") REFERENCES public."TestVariation"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."Baseline" ADD CONSTRAINT "Baseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE;



