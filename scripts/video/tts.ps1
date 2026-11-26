# Offline narration for the video generator (D-47). Windows System.Speech only:
# no text leaves this computer. Reads a JSON list of sentences, writes one WAV
# and a JSON list of word timings: { line, text, start, end } in seconds.
#
#   powershell -NoProfile -File scripts/video/tts.ps1 -In lines.json -Wav voice.wav -Words words.json
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Wav,
  [Parameter(Mandatory = $true)][string]$Words,
  [string]$Voice = 'Microsoft Zira Desktop',
  [int]$Rate = -1,
  [int]$PauseMs = 250
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$lines = Get-Content -Raw -Encoding UTF8 $In | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
$synth.Rate = $Rate
# 16 kHz: SpeakProgress reports AudioPosition on a 16 kHz clock, so any other
# rate puts the word times out of step with the audio (22050 Hz ran 1.38x fast).
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo 16000, ([System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen), ([System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile($Wav, $format)

$script:found = New-Object System.Collections.ArrayList
$script:lineIndex = 0
Register-ObjectEvent -InputObject $synth -EventName SpeakProgress -SourceIdentifier atlasWord | Out-Null

# One prompt with a bookmark before each line, so word events can be tied to lines.
$pb = New-Object System.Speech.Synthesis.PromptBuilder
for ($i = 0; $i -lt $lines.Count; $i++) {
  $pb.AppendBookmark("line$i")
  $pb.AppendText([string]$lines[$i])
  $pb.AppendBreak([TimeSpan]::FromMilliseconds($PauseMs))
}
Register-ObjectEvent -InputObject $synth -EventName BookmarkReached -SourceIdentifier atlasMark | Out-Null
$synth.Speak($pb)

$events = Get-Event | Where-Object { $_.SourceIdentifier -in 'atlasWord', 'atlasMark' } | Sort-Object TimeGenerated, EventIdentifier
$line = -1
foreach ($e in $events) {
  $a = $e.SourceEventArgs
  if ($e.SourceIdentifier -eq 'atlasMark') { $line = [int]($a.Bookmark.Substring(4)); continue }
  [void]$script:found.Add([pscustomobject]@{
      line  = $line
      text  = $a.Text
      start = [math]::Round($a.AudioPosition.TotalSeconds, 3)
      chars = $a.CharacterCount
    })
}
Get-Event | Remove-Event
Unregister-Event atlasWord
Unregister-Event atlasMark
$synth.SetOutputToNull()
$synth.Dispose()

$script:found | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 $Words
Write-Output "words: $($script:found.Count)"
