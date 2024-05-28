-- DROP TYPE public."ImageComparison";

CREATE TYPE public."ImageComparison" AS ENUM (
	'pixelmatch',
	'lookSame',
	'odiff');

-- DROP TYPE public."Role";

CREATE TYPE public."Role" AS ENUM (
	'admin',
	'editor',
	'guest');

-- DROP TYPE public."TestStatus";

CREATE TYPE public."TestStatus" AS ENUM (
	'failed',
	'new',
	'ok',
	'unresolved',
	'approved',
	'autoApproved');

