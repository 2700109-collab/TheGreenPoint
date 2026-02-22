<#
.SYNOPSIS
  NCTS Section 0 — Complete database setup against Neon serverless PostgreSQL.
.DESCRIPTION
  Runs: Extensions → Prisma migrate → Seed → RLS → Sequences → Partitioning → Views.
  Seed runs BEFORE partitioning so audit_events deleteMany works on the 
  non-partitioned table. Partitioning then migrates seed data into partitions.
  Uses 'prisma db execute' to run raw SQL against Neon (no Docker needed).
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$schemaPath = "$root\packages\database\prisma\schema.prisma"
$sqlDir = "$root\infrastructure\sql"

Write-Host "`n=== NCTS Section 0: Database Setup (Neon) ===`n" -ForegroundColor Cyan

# ---- 1. Enable extensions ----
Write-Host "[1/8] Enabling PostgreSQL extensions..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db execute --file "$sqlDir\00-extensions.sql" --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Extensions script had errors (PostGIS may not be available)" -ForegroundColor DarkYellow
} else {
    Write-Host "  Extensions enabled!" -ForegroundColor Green
}
Pop-Location

# ---- 2. Run Prisma migrate ----
Write-Host "`n[2/8] Running Prisma migrate deploy..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Prisma migrate failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Migration complete!" -ForegroundColor Green
Pop-Location

# ---- 3. Seed data (BEFORE partitioning so deleteMany works) ----
Write-Host "`n[3/8] Seeding database..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Seed had errors" -ForegroundColor DarkYellow
} else {
    Write-Host "  Database seeded!" -ForegroundColor Green
}
Pop-Location

# ---- 4. Apply RLS policies (includes FORCE ROW LEVEL SECURITY) ----
Write-Host "`n[4/8] Applying RLS policies..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db execute --file "$sqlDir\01-rls.sql" --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: RLS script had errors (may be OK on re-run)" -ForegroundColor DarkYellow
} else {
    Write-Host "  RLS policies applied!" -ForegroundColor Green
}
Pop-Location

# ---- 5. Create ID sequences ----
Write-Host "`n[5/8] Creating ID sequences..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db execute --file "$sqlDir\02-sequences.sql" --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Sequences script had errors" -ForegroundColor DarkYellow
} else {
    Write-Host "  Sequences created!" -ForegroundColor Green
}
Pop-Location

# ---- 6. Setup audit event partitioning (after seed — migrates data into partitions) ----
Write-Host "`n[6/8] Setting up audit event partitioning..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db execute --file "$sqlDir\03-partitioning.sql" --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Partitioning script had errors" -ForegroundColor DarkYellow
} else {
    Write-Host "  Partitioning complete!" -ForegroundColor Green
}
Pop-Location

# ---- 7. Create materialized views (after seed so views have data) ----
Write-Host "`n[7/8] Creating materialized views..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
npx prisma db execute --file "$sqlDir\04-views.sql" --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Views script had errors" -ForegroundColor DarkYellow
} else {
    Write-Host "  Materialized views created!" -ForegroundColor Green
}
Pop-Location

# ---- 8. Reset ID sequences past seed data ----
Write-Host "`n[8/8] Resetting sequences past seed data..." -ForegroundColor Yellow
Push-Location "$root\packages\database"
$resetSeqSql = "$env:TEMP\ncts-reset-sequences.sql"
[System.IO.File]::WriteAllText($resetSeqSql, @"
SELECT setval('ncts_plant_tracking_seq', 101);
SELECT setval('ncts_batch_number_seq', 3);
SELECT setval('ncts_transfer_number_seq', 2);
SELECT setval('ncts_sale_number_seq', 3);
SELECT setval('ncts_inspection_number_seq', 1);
"@, [System.Text.UTF8Encoding]::new($false))
npx prisma db execute --file $resetSeqSql --schema "$schemaPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Sequence reset had errors" -ForegroundColor DarkYellow
} else {
    Write-Host "  Sequences reset!" -ForegroundColor Green
}
Pop-Location

Write-Host "`n=== Section 0 database setup COMPLETE ===" -ForegroundColor Green
Write-Host "  Database: Neon (spring-sound-82719828)"
Write-Host "  Region:   aws-eu-central-1 (Frankfurt)"
Write-Host "  Run 'npx prisma studio' from packages/database to browse data.`n"
