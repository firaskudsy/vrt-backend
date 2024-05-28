-- public."TestVariation" definition

-- Drop table

-- DROP TABLE public."TestVariation";

CREATE TABLE public."TestVariation" (
	id text NOT NULL,
	"name" text NOT NULL,
	"branchName" text DEFAULT 'master'::text NOT NULL,
	browser text DEFAULT ''::text NOT NULL,
	device text DEFAULT ''::text NOT NULL,
	os text DEFAULT ''::text NOT NULL,
	viewport text DEFAULT ''::text NOT NULL,
	"customTags" text DEFAULT ''::text NOT NULL,
	"baselineName" text NULL,
	"ignoreAreas" text DEFAULT '[]'::text NOT NULL,
	"projectId" text NOT NULL,
	"comment" text NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "TestVariation_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "TestVariation_projectId_name_browser_device_os_viewport_cus_key" ON public."TestVariation" USING btree ("projectId", name, browser, device, os, viewport, "customTags", "branchName");


-- public."TestVariation" foreign keys

ALTER TABLE public."TestVariation" ADD CONSTRAINT "TestVariation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON DELETE RESTRICT ON UPDATE CASCADE;