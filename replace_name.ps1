$extensions = @('*.jsx', '*.js', '*.ts', '*.tsx', '*.json', '*.css', '*.html', '*.java', '*.xml', '*.properties', '*.md', '*.sql', '*.yml', '*.yaml', '*.ps1', 'Dockerfile', '.env*', '.htaccess')
$files = Get-ChildItem -Path "d:\AI-HyperKart-Commerce" -Recurse -Include $extensions | Where-Object { 
    $_.FullName -notmatch '\\node_modules\\' -and 
    $_.FullName -notmatch '\\target\\' -and 
    $_.FullName -notmatch '\\\.git\\' -and 
    $_.FullName -notmatch '\\dist\\' 
}

$count = 0
foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        if ($content -match "hyperkart" -or $content -match "hyperkart") {
            $updated = $content -creplace "HYPERKART", "HYPERKART" `
                                -creplace "HyperKart", "HyperKart" `
                                -creplace "HyperKart", "HyperKart" `
                                -creplace "hyperkart", "hyperkart" `
                                -creplace "HYPERKART", "HYPERKART" `
                                -creplace "HyperKart", "HyperKart" `
                                -creplace "hyperkart", "hyperkart"
            if ($content -ne $updated) {
                [System.IO.File]::WriteAllText($file.FullName, $updated)
                Write-Host "Updated: $($file.FullName)"
                $count++
            }
        }
    } catch {
        # Ignore read errors
    }
}
Write-Host "Completed replacement in $count files."
