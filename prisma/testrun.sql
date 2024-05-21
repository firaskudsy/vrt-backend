-- public."TestRun" definition

-- Drop table

-- DROP TABLE public."TestRun";

CREATE TABLE public."TestRun" (
	id text NOT NULL,
	"imageName" text NOT NULL,
	"diffName" text NULL,
	"diffPercent" float8 NULL,
	"diffTollerancePercent" float8 DEFAULT 0 NOT NULL,
	"pixelMisMatchCount" int4 NULL,
	status public."TestStatus" NOT NULL,
	"buildId" text NOT NULL,
	"testVariationId" text NULL,
	"projectId" text NULL,
	"merge" bool DEFAULT false NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text DEFAULT ''::text NOT NULL,
	browser text NULL,
	device text NULL,
	os text NULL,
	viewport text NULL,
	"customTags" text DEFAULT ''::text NULL,
	"baselineName" text NULL,
	"comment" text NULL,
	"branchName" text DEFAULT 'master'::text NOT NULL,
	"baselineBranchName" text NULL,
	"ignoreAreas" text DEFAULT '[]'::text NOT NULL,
	"tempIgnoreAreas" text DEFAULT '[]'::text NOT NULL,
	CONSTRAINT "TestRun_pkey" PRIMARY KEY (id)
);


-- public."TestRun" foreign keys

ALTER TABLE public."TestRun" ADD CONSTRAINT "TestRun_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES public."Build"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."TestRun" ADD CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public."TestRun" ADD CONSTRAINT "TestRun_testVariationId_fkey" FOREIGN KEY ("testVariationId") REFERENCES public."TestVariation"(id) ON DELETE SET NULL ON UPDATE CASCADE;