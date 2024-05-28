-- public."User" definition

-- Drop table

-- DROP TABLE public."User";

CREATE TABLE public."User" (
	id text NOT NULL,
	email text NOT NULL,
	"password" text NOT NULL,
	"firstName" text NULL,
	"lastName" text NULL,
	"apiKey" text NOT NULL,
	"isActive" bool DEFAULT true NOT NULL,
	"role" public."Role" DEFAULT 'guest'::"Role" NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "User_apiKey_key" ON public."User" USING btree ("apiKey");
CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);



INSERT INTO public."User"
(id, email, "password", "firstName", "lastName", "apiKey", "isActive", "role", "updatedAt", "createdAt")
VALUES('769989ca-2ddf-46cd-856c-f24724b4b3e9', 'visual-regression-tracker@example.com', '$2a$10$1qYOlQSbRVxY/1Obb7/OR.OUGnBuRPTl83InnrtyHmnFnKHo7uqea', 'fname', 'lname', 'DEFAULTUSERAPIKEYTOBECHANGED', true, 'admin'::"Role", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);