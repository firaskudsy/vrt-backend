#!/bin/sh
set -e

# /app/wait-for-it.sh 0.0.0.0:5404 -- echo Postgress is up!

echo Start applying migrations...

# apply migration
npx prisma migrate deploy

echo Seeding data...

# seed data
npx ts-node seed.ts