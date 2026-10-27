<#
.SYNOPSIS
  Generates docs/evidencias/evidence.txt by calling the API with curl.

.DESCRIPTION
  Every value (port, API key, credentials and the disposable database) is read
  from .env: nothing is hardcoded here.

  The script:
    1. builds the project,
    2. boots a disposable PostgreSQL cluster (scripts/evidence-db.mjs),
    3. starts the API pointing to that cluster,
    4. runs the curl scenarios and records request/response,
    5. writes the evidence and stops everything.

  Usage: npm run evidence

  Each scenario declares the HTTP status it must answer according to the
  business rules; a difference is reported as a failure and makes the script
  exit with code 1.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$outputDir = Join-Path $root 'docs\evidencias'
$outputFile = Join-Path $outputDir 'evidence.txt'

if (-not (Test-Path $envFile)) {
  throw ".env not found. Copy .env.example to .env and complete it."
}

if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
  throw 'curl.exe is required to generate the evidence.'
}

# ---------------------------------------------------------------------------
# .env: parsed into $settings and exported to this process, so the API child
# process inherits exactly the same environment.
# ---------------------------------------------------------------------------
$settings = @{}

foreach ($line in (Get-Content $envFile)) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
  $separator = $trimmed.IndexOf('=')
  if ($separator -lt 1) { continue }
  $key = $trimmed.Substring(0, $separator).Trim()
  $value = $trimmed.Substring($separator + 1).Trim()
  $settings[$key] = $value
  Set-Item -Path "Env:$key" -Value $value
}

function Get-Setting {
  param([string]$Name, [switch]$Optional)
  if ($settings.ContainsKey($Name) -and $settings[$Name]) { return $settings[$Name] }
  if ($Optional) { return $null }
  throw "Missing ""$Name"" in .env"
}

$port = Get-Setting 'PORT'
$hostName = Get-Setting 'HOST'
$seedPassword = Get-Setting 'SEED_USER_PASSWORD'
$apiKeys = Get-Setting 'TEST_API_KEYS'
$script:apiKey = ($apiKeys -split ',')[0].Trim()
$script:baseUrl = "http://${hostName}:$port"

# The API runs against the disposable database of the test section.
$env:DB_HOST = Get-Setting 'TEST_DB_HOST'
$env:DB_PORT = Get-Setting 'TEST_PG_PORT'
$env:DB_NAME = Get-Setting 'TEST_DB_NAME'
$env:DB_USER = Get-Setting 'TEST_DB_USER'
$env:DB_PASSWORD = Get-Setting 'TEST_DB_PASSWORD'
$env:DB_SYNCHRONIZE = Get-Setting 'TEST_DB_SYNCHRONIZE'
$env:API_KEYS = $apiKeys

$admin = 'admin-1'
$coordinator = 'coordinator-1'
$receptionist1 = 'receptionist-1'
$receptionist2 = 'receptionist-2'

$today = Get-Date
$script:checkIn = $today.AddDays(10).ToString('yyyy-MM-dd')
$script:checkOut = $today.AddDays(14).ToString('yyyy-MM-dd')
$script:checkInLate = $today.AddDays(30).ToString('yyyy-MM-dd')
$script:checkOutLate = $today.AddDays(34).ToString('yyyy-MM-dd')
$script:pastIn = $today.AddDays(-10).ToString('yyyy-MM-dd')
$script:pastOut = $today.AddDays(-5).ToString('yyyy-MM-dd')

# ---------------------------------------------------------------------------
# Evidence buffer
# ---------------------------------------------------------------------------
$script:report = New-Object System.Collections.Generic.List[string]
$script:index = 0
$script:passed = 0
$script:failed = 0
$script:failedTitles = New-Object System.Collections.Generic.List[string]

function Add-Report {
  param([string]$Text)
  $script:report.Add($Text)
}

function Add-Section {
  param([string]$Title)
  Add-Report ''
  Add-Report ('=' * 74)
  Add-Report $Title.ToUpper()
  Add-Report ('=' * 74)
}

function New-ReservationBody {
  param(
    [string]$Guest = 'Juan Perez',
    [string]$Document = '12345678',
    [string]$RoomType = 'SINGLE',
    [string]$CheckIn = $script:checkIn,
    [string]$CheckOut = $script:checkOut,
    [int]$RoomId = 1,
    [int]$ReceptionistId = -1
  )

  $json = '{"guest":"' + $Guest + '","guestDocument":"' + $Document + '","roomType":"' + $RoomType + '"'
  $json += ',"checkInDate":"' + $CheckIn + '","checkOutDate":"' + $CheckOut + '"'
  $json += ',"roomId":' + $RoomId
  if ($ReceptionistId -ge 0) { $json += ',"receptionistId":' + $ReceptionistId }
  return $json + '}'
}

function Add-Scenario {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$User = '',
    [string]$Body = '',
    [int]$Expected = 200,
    [switch]$WithoutKey,
    [string]$Key,
    [string]$Authorization = ''
  )

  $script:index++
  $curlArgs = @('-s', '-i', '-X', $Method, "$($script:baseUrl)$Path")
  $display = "curl -i -X $Method"

  if ($Authorization) {
    $curlArgs += @('-H', "Authorization: Bearer $Authorization")
    $display += " -H `"Authorization: Bearer <token>`""
  }

  if (-not $WithoutKey) {
    $keyValue = if ($Key) { $Key } else { $script:apiKey }
    $curlArgs += @('-H', "x-api-key: $keyValue")
    $display += " -H `"x-api-key: $keyValue`""
  }

  if ($User) {
    $curlArgs += @('-H', "x-user: $User")
    $display += " -H `"x-user: $User`""
  }

  $bodyFile = $null
  if ($Body) {
    $bodyFile = Join-Path ([System.IO.Path]::GetTempPath()) ("evidence-body-{0}.json" -f $script:index)
    [System.IO.File]::WriteAllText($bodyFile, $Body)
    $curlArgs += @('-H', 'Content-Type: application/json', '-H', 'Expect:', '-d', "@$bodyFile")
    $display += " -H `"Content-Type: application/json`" -d '$Body'"
  }

  $raw = (& curl.exe @curlArgs 2>$null) -join "`n"
  if ($bodyFile) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }

  $lines = $raw -split "`r?`n"
  $statusLine = $lines[0]
  $statusCode = 0
  if ($statusLine -match '^HTTP/\S+\s+(\d+)') { $statusCode = [int]$Matches[1] }

  $separatorIndex = [Array]::IndexOf($lines, '')
  if ($separatorIndex -lt 0) { $separatorIndex = $lines.Count }
  $responseBody = ''
  if ($separatorIndex + 1 -le $lines.Count - 1) {
    $responseBody = ($lines[($separatorIndex + 1)..($lines.Count - 1)] -join "`n").Trim()
  }

  $ok = ($statusCode -eq $Expected)
  if ($ok) { $script:passed++ } else { $script:failed++; $script:failedTitles.Add($Title) }

  Add-Report ''
  Add-Report ('-' * 74)
  Add-Report ("[{0:d2}] {1}" -f $script:index, $Title)
  Add-Report ("Expected HTTP {0} | Received HTTP {1} | {2}" -f $Expected, $statusCode, $(if ($ok) { 'OK' } else { 'MISMATCH' }))
  Add-Report "`$ $display"
  if ($statusLine) { Add-Report $statusLine }
  if ($responseBody) { Add-Report $responseBody }

  return [pscustomobject]@{
    Status = $statusCode
    Body   = $responseBody
  }
}

function Get-Json {
  param([object]$Scenario)
  if (-not $Scenario -or -not $Scenario.Body) { return $null }
  try { return ($Scenario.Body | ConvertFrom-Json) } catch { return $null }
}

# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------
$readyFile = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-db.ready'
$stopFile = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-db.stop'
$dbLog = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-db.log'
$dbErrLog = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-db.err.log'
$apiLog = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-api.log'
$apiErrLog = Join-Path ([System.IO.Path]::GetTempPath()) 'arenosa-evidence-api.err.log'

$dbProcess = $null
$apiProcess = $null

function Stop-EvidenceApi {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

function Stop-EvidenceDatabase {
  if (Test-Path $stopFile) { Remove-Item $stopFile -Force -ErrorAction SilentlyContinue }
  if ($dbProcess -and -not $dbProcess.HasExited) {
    # Graceful shutdown: evidence-db.mjs stops the cluster when it sees the file.
    Set-Content -Path $stopFile -Value (Get-Date).ToString('o')
    $limit = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $limit -and -not $dbProcess.HasExited) {
      Start-Sleep -Milliseconds 500
    }
    if (-not $dbProcess.HasExited) {
      Stop-Process -Id $dbProcess.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

try {
  Write-Host 'Building the project...'
  Push-Location $root
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The build failed.' }
  } finally {
    Pop-Location
  }

  Write-Host 'Starting the disposable PostgreSQL...'
  Remove-Item $readyFile, $stopFile -Force -ErrorAction SilentlyContinue
  $dbProcess = Start-Process -FilePath 'node' -ArgumentList 'scripts\evidence-db.mjs' -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $dbLog -RedirectStandardError $dbErrLog

  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline -and -not (Test-Path $readyFile)) {
    if ($dbProcess.HasExited) { break }
    Start-Sleep -Milliseconds 500
  }

  if (-not (Test-Path $readyFile)) {
    Write-Host (Get-Content $dbLog -Raw -ErrorAction SilentlyContinue)
    Write-Host (Get-Content $dbErrLog -Raw -ErrorAction SilentlyContinue)
    throw 'PostgreSQL did not start.'
  }

  Write-Host "Starting the API on $($script:baseUrl)..."
  $apiProcess = Start-Process -FilePath 'node' -ArgumentList 'dist\main.js' -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrLog

  $docsUrl = "$($script:baseUrl)/api/docs-json"
  $ready = $false
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    if ($apiProcess.HasExited) { break }
    $probe = & curl.exe -s -o NUL -w '%{http_code}' -H "x-api-key: $($script:apiKey)" -H "x-user: $admin" $docsUrl 2>$null
    if ($probe -eq '200') { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }

  if (-not $ready) {
    Write-Host (Get-Content $apiLog -Raw -ErrorAction SilentlyContinue)
    Write-Host (Get-Content $apiErrLog -Raw -ErrorAction SilentlyContinue)
    throw 'The API did not start.'
  }

  # -----------------------------------------------------------------------
  Add-Report 'ARENOSA HOTELS S.A.S. - RESERVATIONS API'
  Add-Report 'Evidence of the business rules executed with curl'
  Add-Report ('Generated : ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))
  Add-Report ('Base url  : ' + $script:baseUrl)
  Add-Report ('API keys  : ' + $apiKeys)
  Add-Report ('Database  : ' + $env:DB_USER + '@' + $env:DB_HOST + ':' + $env:DB_PORT + '/' + $env:DB_NAME)
  Add-Report 'Every request sends the x-api-key header; the identity comes from x-user'
  Add-Report 'unless the case states otherwise.'

  # --- 1. Identity (RN-04) ------------------------------------------------
  Add-Section '1. Identity and API key (RN-04)'

  Add-Scenario -Title 'GET /hotels without the x-api-key header' -Method 'GET' -Path '/hotels' -User $admin -WithoutKey -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /hotels with an API key that is not valid' -Method 'GET' -Path '/hotels' -User $admin -Key 'not-a-valid-key' -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /hotels without the x-user header' -Method 'GET' -Path '/hotels' -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /hotels with a user that does not exist' -Method 'GET' -Path '/hotels' -User 'ghost-user' -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /hotels with a valid key and a valid user' -Method 'GET' -Path '/hotels' -User $admin -Expected 200 | Out-Null

  # --- 2. Master data -----------------------------------------------------
  Add-Section '2. Master data seeded in PostgreSQL'

  Add-Scenario -Title 'GET /hotels - the three branches of the chain' -Method 'GET' -Path '/hotels' -User $admin | Out-Null
  Add-Scenario -Title 'GET /rooms - the six rooms with their branch' -Method 'GET' -Path '/rooms' -User $admin | Out-Null
  Add-Scenario -Title 'GET /receptionists - the receptionists referenced by the reservations' -Method 'GET' -Path '/receptionists' -User $admin | Out-Null

  # --- 3. Authentication --------------------------------------------------
  Add-Section '3. Authentication (JWT issued by POST /auth/login)'

  $login = Add-Scenario -Title 'POST /auth/login with the credentials of the seed' -Method 'POST' -Path '/auth/login' -Body ('{"username":"' + $admin + '","password":"' + $seedPassword + '"}') -Expected 200
  $token = ''
  $loginJson = Get-Json $login
  if ($loginJson -and $loginJson.data) { $token = $loginJson.data.access_token }

  Add-Scenario -Title 'POST /auth/login with a wrong password' -Method 'POST' -Path '/auth/login' -Body ('{"username":"' + $admin + '","password":"not-the-password"}') -Expected 401 | Out-Null
  Add-Scenario -Title 'POST /auth/login with a user that does not exist (same message)' -Method 'POST' -Path '/auth/login' -Body ('{"username":"ghost-user","password":"' + $seedPassword + '"}') -Expected 401 | Out-Null
  Add-Scenario -Title 'POST /auth/login without the password (invalid DTO)' -Method 'POST' -Path '/auth/login' -Body ('{"username":"' + $admin + '"}') -Expected 400 | Out-Null
  Add-Scenario -Title 'POST /auth/login still requires the API key' -Method 'POST' -Path '/auth/login' -Body ('{"username":"' + $admin + '","password":"' + $seedPassword + '"}') -WithoutKey -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /auth/profile with the token of the seed' -Method 'GET' -Path '/auth/profile' -Authorization $token -Expected 200 | Out-Null
  Add-Scenario -Title 'GET /auth/profile without a token (the API key is still required)' -Method 'GET' -Path '/auth/profile' -Expected 401 | Out-Null
  Add-Scenario -Title 'GET /auth/profile with a broken signature' -Method 'GET' -Path '/auth/profile' -Authorization 'eyJhbGciOiJIUzI1NiJ9.broken.signature' -Expected 401 | Out-Null

  # --- 4. Register a reservation (RN-01) ----------------------------------
  Add-Section '4. Register a reservation (RN-01)'

  $byReceptionist = Add-Scenario -Title 'A receptionist registers on their own behalf' -Method 'POST' -Path '/reservations' -User $receptionist1 -Body (New-ReservationBody) -Expected 201
  $firstId = 0
  $firstJson = Get-Json $byReceptionist
  if ($firstJson -and $firstJson.data) { $firstId = $firstJson.data.id }

  Add-Scenario -Title 'The receptionistId sent by a receptionist is ignored' -Method 'POST' -Path '/reservations' -User $receptionist1 -Body (New-ReservationBody -CheckIn $script:checkInLate -CheckOut $script:checkOutLate -ReceptionistId 2) -Expected 201 | Out-Null

  $byCoordinator = Add-Scenario -Title 'A coordinator registers a reservation for receptionist 1' -Method 'POST' -Path '/reservations' -User $coordinator -Body (New-ReservationBody -RoomType 'DOUBLE' -RoomId 2 -ReceptionistId 1) -Expected 201
  $secondId = 0
  $secondJson = Get-Json $byCoordinator
  if ($secondJson -and $secondJson.data) { $secondId = $secondJson.data.id }

  $byReceptionist2 = Add-Scenario -Title 'Receptionist 2 registers their own reservation' -Method 'POST' -Path '/reservations' -User $receptionist2 -Body (New-ReservationBody -RoomType 'DOUBLE' -RoomId 4 -ReceptionistId 99) -Expected 201
  $fourthId = 0
  $fourthJson = Get-Json $byReceptionist2
  if ($fourthJson -and $fourthJson.data) { $fourthId = $fourthJson.data.id }

  $third = Add-Scenario -Title 'A receptionist registers a second reservation' -Method 'POST' -Path '/reservations' -User $receptionist1 -Body (New-ReservationBody -RoomType 'SUITE' -RoomId 3) -Expected 201
  $thirdId = 0
  $thirdJson = Get-Json $third
  if ($thirdJson -and $thirdJson.data) { $thirdId = $thirdJson.data.id }

  Add-Scenario -Title 'An admin must send receptionistId' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody) -Expected 400 | Out-Null
  Add-Scenario -Title 'receptionistId that does not exist' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -ReceptionistId 999) -Expected 400 | Out-Null
  Add-Scenario -Title 'roomId that does not exist' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -RoomId 999 -ReceptionistId 1) -Expected 400 | Out-Null
  Add-Scenario -Title 'Protected field (status) rejected by the ValidationPipe' -Method 'POST' -Path '/reservations' -User $admin -Body ('{"guest":"Juan Perez","guestDocument":"12345678","roomType":"SINGLE","checkInDate":"' + $script:checkIn + '","checkOutDate":"' + $script:checkOut + '","roomId":1,"receptionistId":1,"status":"CONFIRMED"}') -Expected 400 | Out-Null
  Add-Scenario -Title 'guestDocument that is not 6 to 12 digits' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -Document '12AB5678' -ReceptionistId 1) -Expected 400 | Out-Null
  Add-Scenario -Title 'roomType outside the catalogue' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -RoomType 'PENTHOUSE' -ReceptionistId 1) -Expected 400 | Out-Null
  Add-Scenario -Title 'checkOutDate before checkInDate' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -CheckIn $script:checkIn -CheckOut $script:pastOut -ReceptionistId 1) -Expected 400 | Out-Null
  Add-Scenario -Title 'checkInDate in the past' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -CheckIn $script:pastIn -CheckOut $script:pastOut -ReceptionistId 1) -Expected 400 | Out-Null
  Add-Scenario -Title 'Date that is not ISO 8601' -Method 'POST' -Path '/reservations' -User $admin -Body (New-ReservationBody -CheckIn '13-02-2027' -CheckOut '17-02-2027' -ReceptionistId 1) -Expected 400 | Out-Null

  # --- 5. List (RN-02) ----------------------------------------------------
  Add-Section '5. List the reservations (RN-02)'

  Add-Scenario -Title 'GET /reservations as admin - every reservation of the chain' -Method 'GET' -Path '/reservations' -User $admin | Out-Null
  Add-Scenario -Title 'GET /reservations?status=PENDING - filter combined with the role' -Method 'GET' -Path '/reservations?status=PENDING' -User $admin | Out-Null
  Add-Scenario -Title 'GET /reservations as receptionist 1 - only their own reservations' -Method 'GET' -Path '/reservations' -User $receptionist1 | Out-Null
  Add-Scenario -Title 'GET /reservations?status=INVALID - status outside the catalogue' -Method 'GET' -Path '/reservations?status=INVALID' -User $admin -Expected 400 | Out-Null
  Add-Scenario -Title 'GET /reservations?foo=1 - unknown query parameter' -Method 'GET' -Path '/reservations?foo=1' -User $admin -Expected 400 | Out-Null

  # --- 6. Status machine (RN-03) ------------------------------------------
  Add-Section '6. Change the status of a reservation (RN-03)'

  Add-Scenario -Title 'PENDING to CONFIRMED as admin' -Method 'PATCH' -Path ("/reservations/$firstId/status") -User $admin -Body '{"status":"CONFIRMED"}' | Out-Null
  Add-Scenario -Title 'CONFIRMED back to PENDING (transition not allowed)' -Method 'PATCH' -Path ("/reservations/$firstId/status") -User $admin -Body '{"status":"PENDING"}' -Expected 409 | Out-Null
  Add-Scenario -Title 'PENDING to IN_PROGRESS (status jump not allowed)' -Method 'PATCH' -Path ("/reservations/$thirdId/status") -User $admin -Body '{"status":"IN_PROGRESS"}' -Expected 409 | Out-Null
  Add-Scenario -Title 'PENDING to CONFIRMED as coordinator' -Method 'PATCH' -Path ("/reservations/$secondId/status") -User $coordinator -Body '{"status":"CONFIRMED"}' | Out-Null
  Add-Scenario -Title 'CONFIRMED to IN_PROGRESS as coordinator' -Method 'PATCH' -Path ("/reservations/$secondId/status") -User $coordinator -Body '{"status":"IN_PROGRESS"}' | Out-Null
  Add-Scenario -Title 'IN_PROGRESS to FINISHED as coordinator' -Method 'PATCH' -Path ("/reservations/$secondId/status") -User $coordinator -Body '{"status":"FINISHED"}' | Out-Null
  Add-Scenario -Title 'FINISHED is a final status' -Method 'PATCH' -Path ("/reservations/$secondId/status") -User $admin -Body '{"status":"IN_PROGRESS"}' -Expected 409 | Out-Null
  Add-Scenario -Title 'A receptionist cannot cancel, not even their own reservation' -Method 'PATCH' -Path ("/reservations/$thirdId/status") -User $receptionist1 -Body '{"status":"CANCELLED"}' -Expected 403 | Out-Null
  Add-Scenario -Title 'A receptionist can change their own reservation' -Method 'PATCH' -Path ("/reservations/$thirdId/status") -User $receptionist1 -Body '{"status":"CONFIRMED"}' | Out-Null
  Add-Scenario -Title 'A receptionist cannot change a reservation of another receptionist' -Method 'PATCH' -Path ("/reservations/$fourthId/status") -User $receptionist1 -Body '{"status":"CONFIRMED"}' -Expected 403 | Out-Null
  Add-Scenario -Title 'An admin can cancel a CONFIRMED reservation' -Method 'PATCH' -Path ("/reservations/$firstId/status") -User $admin -Body '{"status":"CANCELLED"}' | Out-Null
  Add-Scenario -Title 'Status outside the catalogue' -Method 'PATCH' -Path ("/reservations/$firstId/status") -User $admin -Body '{"status":"ARCHIVED"}' -Expected 400 | Out-Null
  Add-Scenario -Title 'Fields other than status are rejected' -Method 'PATCH' -Path ("/reservations/$firstId/status") -User $admin -Body '{"status":"CONFIRMED","guest":"Someone"}' -Expected 400 | Out-Null
  Add-Scenario -Title 'Reservation that does not exist' -Method 'PATCH' -Path '/reservations/99999/status' -User $admin -Body '{"status":"CONFIRMED"}' -Expected 404 | Out-Null
  Add-Scenario -Title 'Id that is not a positive number' -Method 'PATCH' -Path '/reservations/not-a-number/status' -User $admin -Body '{"status":"CONFIRMED"}' -Expected 400 | Out-Null

  # --- 7. Detail (RN-05) --------------------------------------------------
  Add-Section '7. Reservation detail (RN-05)'

  Add-Scenario -Title 'GET /reservations/:id as admin' -Method 'GET' -Path "/reservations/$firstId" -User $admin | Out-Null
  Add-Scenario -Title 'GET /reservations/:id of another receptionist' -Method 'GET' -Path "/reservations/$fourthId" -User $receptionist1 -Expected 403 | Out-Null
  Add-Scenario -Title 'GET /reservations/:id that does not exist' -Method 'GET' -Path '/reservations/99999' -User $admin -Expected 404 | Out-Null

  # --- 8. Summary ---------------------------------------------------------
  Add-Section '8. Summary of the reservations'

  Add-Scenario -Title 'GET /reservations/summary as admin' -Method 'GET' -Path '/reservations/summary' -User $admin | Out-Null
  Add-Scenario -Title 'GET /reservations/summary as coordinator' -Method 'GET' -Path '/reservations/summary' -User $coordinator | Out-Null
  Add-Scenario -Title 'GET /reservations/summary as receptionist (forbidden)' -Method 'GET' -Path '/reservations/summary' -User $receptionist1 -Expected 403 | Out-Null

  # --- 9. Users -----------------------------------------------------------
  Add-Section '9. Administration of the users (admin only)'

  Add-Scenario -Title 'GET /users as admin - the seed accounts, without the hash' -Method 'GET' -Path '/users' -User $admin | Out-Null
  Add-Scenario -Title 'GET /users as coordinator (forbidden)' -Method 'GET' -Path '/users' -User $coordinator -Expected 403 | Out-Null
  Add-Scenario -Title 'GET /users as receptionist (forbidden)' -Method 'GET' -Path '/users' -User $receptionist1 -Expected 403 | Out-Null

  $created = Add-Scenario -Title 'POST /users - creates a coordinator account' -Method 'POST' -Path '/users' -User $admin -Body '{"username":"temporary-user","name":"Temporary User","role":"coordinator","password":"Secret123"}' -Expected 201
  $createdId = 0
  $createdJson = Get-Json $created
  if ($createdJson -and $createdJson.data) { $createdId = $createdJson.data.id }

  Add-Scenario -Title 'POST /users - duplicated username' -Method 'POST' -Path '/users' -User $admin -Body ('{"username":"' + $admin + '","name":"Another admin","role":"admin","password":"Secret123"}') -Expected 400 | Out-Null
  Add-Scenario -Title 'POST /users - receptionist role without receptionistId' -Method 'POST' -Path '/users' -User $admin -Body '{"username":"receptionist-9","name":"New receptionist","role":"receptionist","password":"Secret123"}' -Expected 400 | Out-Null
  Add-Scenario -Title 'POST /users - role outside the catalogue' -Method 'POST' -Path '/users' -User $admin -Body '{"username":"user-9","name":"User nine","role":"manager","password":"Secret123"}' -Expected 400 | Out-Null
  Add-Scenario -Title 'POST /users - short password' -Method 'POST' -Path '/users' -User $admin -Body '{"username":"user-10","name":"User ten","role":"coordinator","password":"123"}' -Expected 400 | Out-Null
  Add-Scenario -Title 'PATCH /users/:id - links the account to receptionist 2' -Method 'PATCH' -Path "/users/$createdId" -User $admin -Body '{"role":"receptionist","receptionistId":2}' | Out-Null
  Add-Scenario -Title 'GET /users/:id that does not exist' -Method 'GET' -Path '/users/99999' -User $admin -Expected 404 | Out-Null
  Add-Scenario -Title 'GET /users/:id with an id that is not a number' -Method 'GET' -Path '/users/not-a-number' -User $admin -Expected 400 | Out-Null
  Add-Scenario -Title 'DELETE /users/:id removes the temporary account' -Method 'DELETE' -Path "/users/$createdId" -User $admin | Out-Null

  # --- 10. Error format (RN-06) -------------------------------------------
  Add-Section '10. Normalised error format (RN-06)'

  Add-Scenario -Title 'Every error answers the same envelope (example with 400)' -Method 'POST' -Path '/reservations' -User $admin -Body '{"guest":"Juan Perez"}' -Expected 400 | Out-Null

  # -----------------------------------------------------------------------
  Add-Report ''
  Add-Report ('=' * 74)
  Add-Report 'RESULT'
  Add-Report ('=' * 74)
  Add-Report ("Scenarios: {0} | Expected answers: {1} | Mismatches: {2}" -f ($script:passed + $script:failed), $script:passed, $script:failed)

  if ($script:failed -gt 0) {
    Add-Report ''
    Add-Report 'Scenarios with a different answer:'
    foreach ($title in $script:failedTitles) { Add-Report "  - $title" }
  }

  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  [System.IO.File]::WriteAllText($outputFile, (($script:report -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))

  Write-Host ''
  Write-Host "Evidence written to $outputFile"
  Write-Host ("Scenarios: {0} | OK: {1} | Mismatches: {2}" -f ($script:passed + $script:failed), $script:passed, $script:failed)

  if ($script:failed -gt 0) { exit 1 }
  exit 0
}
finally {
  Write-Host 'Stopping the API and the database...'
  Stop-EvidenceApi
  Stop-EvidenceDatabase
}
