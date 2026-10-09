# Release notes 0.5.0:
- In deze versie is het mogelijk om meerdere teams te configureren
- Maak via de main view sub views voor ieder team aam via de synchronisatie knop
- Ieder team krijgt zijn eigen aankomst tijd voor UIT en THUIS wedstrijden
- Reistijd >59 Min wordt nu 1 uur
- Uit en thuis teams nog beter gescheiden
- Navigeer via de hoofdpagina gemakkelijk naar de teamviews door op de "Clubnaam - Teamnaam" te drukken



# Dashboard toevoegen

Maak een nieuw dashboard aan en gebruik deze RAW code

```yaml
views:
  - title: Coach
    type: panel
    cards:
      - type: custom:knbsb-schedule-card
        view: coach

```

Hiermee activeer je het dashboard dat alle teams toont die zijn toegevoegd aan de integratie. Zie hieronder een voorbeeld emt 4 teams:

<img width="3504" height="1172" alt="screenshot-3" src="https://github.com/user-attachments/assets/c2ed856b-faf5-4a8e-b8ad-82c2662dcc1e" />

# Team views aanmaken/verwijderen

Om per team een eigen team view te krijgen druk je op de "Teamviews synchroniseren knop" . Heb je een team niet meer in de integratie druk dan nogmaals op de sync knop en het verwijderde teamv zal worden verwijded uit de view.
