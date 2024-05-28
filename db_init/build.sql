-- public."Build" definition

-- Drop table

-- DROP TABLE public."Build";

CREATE TABLE public."Build" (
	id text NOT NULL,
	"ciBuildId" text NULL,
	"number" int4 NULL,
	"branchName" text NULL,
	status text NULL,
	"projectId" text NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" text NULL,
	"isRunning" bool NULL,
	CONSTRAINT "Build_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "Build_projectId_ciBuildId_key" ON public."Build" USING btree ("projectId", "ciBuildId");


-- public."Build" foreign keys

ALTER TABLE public."Build" ADD CONSTRAINT "Build_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."Build" ADD CONSTRAINT "Build_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE;