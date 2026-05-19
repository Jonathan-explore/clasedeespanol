$ErrorActionPreference = "Stop"

$downloads = "c:\Users\Usuario\Downloads"
$manifest = "$downloads\manifiesto_final.txt"
"Archivo | Nueva Ubicación" | Out-File $manifest -Encoding utf8

$newFolders = @(
    "Edición de Vídeo y DaVinci Resolve\Proyectos y LUTs",
    "Edición de Vídeo y DaVinci Resolve\SFX y Efectos de Sonido",
    "Edición de Vídeo y DaVinci Resolve\Música de Fondo",
    "Edición de Vídeo y DaVinci Resolve\Instaladores DaVinci",
    "Desarrollo y Software\Entorno Dev",
    "Desarrollo y Software\Herramientas IA",
    "Desarrollo y Software\Juegos y Otros",
    "Desarrollo y Software\Web Portfolio Jonathan",
    "Documentos Personales y Trámites\Identidad y Padrón BCN",
    "Documentos Personales y Trámites\Búsqueda de Empleo",
    "Documentos Personales y Trámites\Trámites Administrativos",
    "Aprendizaje y Dinamarca\Idioma Danés",
    "Aprendizaje y Dinamarca\Vídeos Dinamarca",
    "Deportes y Ocio (Pesca y Apnea)\Equipamiento Apnea y Pesca",
    "Recuerdos y Fotos Familiares\iCloud Andrea Fernández",
    "Recuerdos y Fotos Familiares\Archivos de Cámara y Móvil",
    "Recuerdos y Fotos Familiares\Media de WhatsApp",
    "Generaciones de Inteligencia Artificial\Imágenes IA",
    "Generaciones de Inteligencia Artificial\Vídeos IA",
    "Posible Basura y Temporales\Duplicados",
    "Posible Basura y Temporales\Instaladores Obsoletos",
    "Posible Basura y Temporales\Archivos Residuales",
    "Otros Archivos\Misceláneo"
)

foreach ($folder in $newFolders) {
    $path = Join-Path $downloads $folder
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

function Get-Category ($file) {
    $name = $file.Name
    $ext = $file.Extension.ToLower()
    $length = $file.Length

    # 8. Basura
    if ($name -match "\([1-9]+\)\.|%20copia|copia\.") { return "Posible Basura y Temporales\Duplicados" }
    if ($name -match "^[a-zA-Z0-9]{8}\.exe$" -or $name -match "jre") { return "Posible Basura y Temporales\Instaladores Obsoletos" }
    if ($name -match "desktop\.ini|derby\.log|manifiesto" -or $ext -match "\.unknown$") { return "Posible Basura y Temporales\Archivos Residuales" }

    # 1. DaVinci y Video Ed
    if ($ext -match "\.(drx|drfx|cube)$" -or $name -match "LUT" -or $name -match "GR-44") { return "Edición de Vídeo y DaVinci Resolve\Proyectos y LUTs" }
    if ($name -match "DaVinci|Resolve") { return "Edición de Vídeo y DaVinci Resolve\Instaladores DaVinci" }
    if ($ext -match "\.(mp3|wav)$") {
        if ($length -lt 2000000 -and $name -notmatch "mix|remix|official|lyrics|song|music|instrumental|audio|theme|ncs") {
            return "Edición de Vídeo y DaVinci Resolve\SFX y Efectos de Sonido"
        } else {
            return "Edición de Vídeo y DaVinci Resolve\Música de Fondo"
        }
    }

    # 2. Dev y Software
    if ($name -match "VSCode|python") { return "Desarrollo y Software\Entorno Dev" }
    if ($name -match "Claude|Antigravity") { return "Desarrollo y Software\Herramientas IA" }
    if ($name -match "Minecraft|EAapp|Riot|OP\.GG|Chrome|GoPro|Shapeit|democreator|mInstaller") { return "Desarrollo y Software\Juegos y Otros" }
    if ($name -match "portfolio|game\.js|index\.html|watch\.htm") { return "Desarrollo y Software\Web Portfolio Jonathan" }

    # 3. Documentos
    if ($name -match "DNI|Autorizaci|Padr|Conformitat|AjtBcn|CertResi|modelo-autorizacion") { return "Documentos Personales y Trámites\Identidad y Padrón BCN" }
    if ($name -match "CV|Cover Letter|Candidate|CCC|Tríptico") { return "Documentos Personales y Trámites\Búsqueda de Empleo" }
    if ($name -match "SEPE|CertificadoDS|pedido|return") { return "Documentos Personales y Trámites\Trámites Administrativos" }

    # 4. Dinamarca
    if ($name -match "dansk|skrive") { return "Aprendizaje y Dinamarca\Idioma Danés" }
    if ($name -match "Aarhus|Randers|solnedgang") { return "Aprendizaje y Dinamarca\Vídeos Dinamarca" }

    # 5. Pesca y Apnea
    if ($name -match "aletas|neopreno|Yamamoto|Cressi|TALLAS TRAJES") { return "Deportes y Ocio (Pesca y Apnea)\Equipamiento Apnea y Pesca" }

    # 6. Recuerdos y Fotos Familiares
    if ($name -match "Andrea|iCloud") { return "Recuerdos y Fotos Familiares\iCloud Andrea Fernández" }
    if ($name -match "^IMG_|^VID_|^GX|^DSC|_storage_emulated|Timeline|Andrea Dance") { return "Recuerdos y Fotos Familiares\Archivos de Cámara y Móvil" }
    if ($name -match "WhatsApp") { return "Recuerdos y Fotos Familiares\Media de WhatsApp" }

    # 7. AI
    if ($name -match "ai-generated|Gemini|Generated Image|albert-einstein|woman-1844727|pexels-energepic") { return "Generaciones de Inteligencia Artificial\Imágenes IA" }
    if ($name -match "Quiero_crear|puede_ser_un_video") { return "Generaciones de Inteligencia Artificial\Vídeos IA" }

    # 1. Extras de video
    if ($ext -match "\.mp4|\.mov|\.m4v" -and $name -match "uhd|hd|small|medium|tiny|^[0-9]{5,}") { return "Edición de Vídeo y DaVinci Resolve\SFX y Efectos de Sonido" } # stock videos usually have numbers and quality

    # Catch remaining by old categories
    if ($ext -match "\.jpg|\.png|\.jpeg|\.gif|\.ico|\.tif") { return "Otros Archivos\Misceláneo" }
    if ($ext -match "\.pdf|\.doc|\.docx|\.txt|\.csv") { return "Documentos Personales y Trámites\Trámites Administrativos" }
    if ($ext -match "\.zip|\.rar") { return "Otros Archivos\Misceláneo" }
    
    return "Otros Archivos\Misceláneo"
}

# Collect all files to move
$filesToMove = Get-ChildItem -LiteralPath $downloads -File -Recurse | Where-Object {
    $dir = $_.Directory.FullName
    # Exclude files that are already inside the new target root folders
    $isNew = $false
    foreach ($nf in $newFolders) {
        $rootNf = $nf.Split('\')[0]
        if ($dir -match [regex]::Escape($rootNf)) {
            $isNew = $true; break
        }
    }
    -not $isNew
}

foreach ($file in $filesToMove) {
    $cat = Get-Category $file
    $destDir = Join-Path $downloads $cat
    
    $destPath = Join-Path $destDir $file.Name
    if (Test-Path -LiteralPath $destPath) {
        $base = $file.BaseName
        $ext = $file.Extension
        $num = 1
        while (Test-Path -LiteralPath (Join-Path $destDir "$base ($num)$ext")) { $num++ }
        $newName = "$base ($num)$ext"
        Rename-Item -LiteralPath $file.FullName -NewName $newName
        $file = Get-Item -LiteralPath (Join-Path $file.Directory.FullName $newName)
    }
    
    Move-Item -LiteralPath $file.FullName -Destination $destDir
    "$($file.Name) | $cat" | Out-File -LiteralPath $manifest -Append -Encoding utf8
}

# Now try to delete old empty folders
$oldFolders = @("Documentos", "Imágenes", "Vídeo", "Instaladores", "Audio", "Comprimidos", "Otros", "DaVinci_Resolve_Studio_20.3.2_Windows", "Fotos en iCloud (1)", "Fotos en iCloud de Andrea Fernández García", "GR-44 ST for DR DEMO v1.8 Personal Use", "Pagina web portolio Jonathan", "iCloud-fotos fra Andrea Fernández García", "luts")

foreach ($old in $oldFolders) {
    $p = Join-Path $downloads $old
    if (Test-Path -LiteralPath $p) {
        # remove if empty
        $items = Get-ChildItem -LiteralPath $p -Recurse
        if ($items.Count -eq 0) {
            Remove-Item -LiteralPath $p -Recurse -Force
        }
    }
}
Write-Host "Completado"
