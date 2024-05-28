-- public."Project" definition

-- Drop table

-- DROP TABLE public."Project";

CREATE TABLE public."Project" (
	id text NOT NULL,
	"name" text NOT NULL,
	"mainBranchName" text DEFAULT 'master'::text NOT NULL,
	"buildsCounter" int4 DEFAULT 0 NOT NULL,
	"maxBuildAllowed" int4 DEFAULT 100 NOT NULL,
	"maxBranchLifetime" int4 DEFAULT 30 NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"autoApproveFeature" bool DEFAULT true NOT NULL,
	"imageComparison" public."ImageComparison" DEFAULT 'pixelmatch'::"ImageComparison" NOT NULL,
	"imageComparisonConfig" text DEFAULT '{ "threshold": 0.1, "ignoreAntialiasing": true, "allowDiffDimensions": false }'::text NOT NULL,
	CONSTRAINT "Project_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "Project_name_key" ON public."Project" USING btree (name);


INSERT INTO public."Project"
(id, "name", "mainBranchName", "buildsCounter", "maxBuildAllowed", "maxBranchLifetime", "updatedAt", "createdAt", "autoApproveFeature", "imageComparison", "imageComparisonConfig")
VALUES('0e683f4d-0c5b-4689-9a53-f6a16ba6e731', 'Default project', 'master'::text, 0, 100, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, 'pixelmatch'::"ImageComparison", '{ "threshold": 0.1, "ignoreAntialiasing": true, "allowDiffDimensions": false }'::text);
