class KNBSBScheduleCard extends HTMLElement {

    setConfig(config) {

        this.config = {
            view: config.entity
                ? "team"
                : "coach",
            ...config,
        };


        if (
            this.config.view !== "coach"
            &&
            this.config.view !== "team"
        ) {
            throw new Error(
                "KNBSB Schedule Card: onbekende view"
            );
        }


        if (
            this.config.view === "team"
            &&
            !this.config.team
            &&
            !this.config.entity
        ) {
            throw new Error(
                "KNBSB Schedule Card: team of entity is verplicht voor de Team view"
            );
        }
    }

    getScheduleEntities(hass) {
        return Object.entries(
            hass.states
        )
            .filter(
                ([entityId, state]) => {
                    return (
                        entityId.startsWith(
                            "sensor."
                        ) &&
                        state.attributes.integration
                        === "knbsb" &&
                        state.attributes.data_type
                        === "schedule" &&
                        Array.isArray(
                            state.attributes.matches
                        )
                    );
                }
            )
            .map(
                ([entityId, state]) => {
                    return {
                        entityId,
                        state,
                        teamSlot:
                            state.attributes.team_slot,
                        teamGuid:
                            state.attributes.team_guid,
                        clubName:
                            state.attributes.club_name
                            || "",
                        teamName:
                            state.attributes.team_name
                            || "",
                        teamDisplayName:
                            state.attributes
                                .team_display_name
                            || state.attributes.team_name
                            || entityId,
                        matches:
                            state.attributes.matches
                            || [],
                    };
                }
            )
            .sort(
                (a, b) => {
                    const slotA =
                        Number(a.teamSlot) || 999;

                    const slotB =
                        Number(b.teamSlot) || 999;

                    return slotA - slotB;
                }
            );
    }


    set hass(hass) {

        this._hass = hass;

        let matches = [];

        let teamCount = 0;

        let coachSchedules = [];

        let activeTeamDisplayName = "";


        /*
         * BEPAAL VIEW
         *
         * Coach:
         * automatisch alle KNBSB programma-sensors.
         *
         * Team:
         * gebruik de expliciet ingestelde entity.
         */

        const isCoachView =
            this.config.view === "coach"
            && !this.config.entity;

        const isTeamView =
            this.config.view === "team"
            &&
            !!this.config.team
            &&
            !this.config.entity;



        /*
         * COACH VIEW
         */

        if (isCoachView) {

            const schedules =
                this.getScheduleEntities(
                    hass
                );

        

            teamCount =
                schedules.length;

            coachSchedules =
                schedules;


            /*
             * GEEN PROGRAMMA'S GEVONDEN
             */

            if (
                schedules.length === 0
            ) {

                this.innerHTML = `

                <ha-card class="message-card">

                    Geen KNBSB programma's gevonden

                </ha-card>
            `;

                return;
            }



        } else if (isTeamView) {

            const schedules =
                this.getScheduleEntities(
                    hass
                );


            const schedule =
                schedules.find(
                    (item) =>
                        item.teamGuid
                        === this.config.team
                );


            if (!schedule) {

                this.innerHTML = `

            <ha-card class="message-card">

                KNBSB team niet gevonden:
                ${this.escapeHtml(
                    this.config.team
                )}

            </ha-card>
        `;

                return;
            }


            /*
 * COACH SYNC BUTTON
 *
 * Voorlopig alleen testen of de
 * gebruikersactie correct aankomt.
 */




            teamCount = 1;


            activeTeamDisplayName =
                schedule.teamDisplayName
                || schedule.teamName
                || "KNBSB Team";


            matches =
                schedule.matches.map(
                    (match) => {

                        return {

                            ...match,


                            followed_team_slot:
                                schedule.teamSlot,


                            followed_team_guid:
                                schedule.teamGuid,


                            followed_club_name:
                                schedule.clubName,


                            followed_team_name:
                                schedule.teamName,


                            followed_team_display_name:
                                schedule.teamDisplayName,

                        };
                    }
                );
        }


        if (
            !isCoachView
            &&
            matches.length === 0
        ) {

            this.innerHTML = `

        <ha-card class="message-card">

            Geen geplande wedstrijden

        </ha-card>
    `;

            return;
        }


        /*
         * Eerst alle gevonden wedstrijden
         * chronologisch sorteren.
         */

        if (!isCoachView) {

            matches.sort(
                (a, b) => {

                    const dateA = new Date(
                        `${a.date}T${a.time || "00:00"}`
                    );

                    const dateB = new Date(
                        `${b.date}T${b.time || "00:00"}`
                    );

                    return dateA - dateB;
                }
            );
        }


        let cardContent;


        if (isCoachView) {

            cardContent =
                coachSchedules
                    .map(
                        (schedule) =>
                            this.renderTeamColumn(
                                schedule
                            )
                    )
                    .join("");

        } else {

            cardContent =
                matches
                    .map(
                        (match, index) =>
                            this.renderMatch(
                                match,
                                index === 0
                            )
                    )
                    .join("");
        }

        this.innerHTML = `

            <style>


                /*
                 * COACH ACTIES
                 */

                .coach-actions {
                    display: flex;

                    justify-content: center;

                    margin-top: -10px;
                    margin-bottom: 24px;
                }

                .coach-team-header {
                    margin-bottom: 14px;

                    padding: 12px 16px;

                    border-radius: 14px;

                    background:
                        color-mix(
                            in srgb,
                            var(--primary-color) 12%,
                            transparent
                        );

                    display: flex;

                    align-items: center;

                    justify-content: space-between;

                    gap: 12px;

                    text-align: center;

                    font-size: 17px;
                    font-weight: 700;

                    color:
                        var(--primary-text-color);

                    cursor: pointer;

                    transition:
                        filter 0.15s ease,
                        transform 0.15s ease;
                }


                .coach-team-header:hover {
                    filter: brightness(1.08);

                    transform: translateY(-1px);
                }


                .coach-team-header:active {
                    transform: translateY(0);
                }


                .coach-team-link-icon {
                    flex: 0 0 auto;

                    font-size: 20px;
                    font-weight: 700;

                    color:
                        var(--primary-color);
                }
                .coach-sync-button {
                    display: inline-flex;

                    align-items: center;
                    justify-content: center;

                    gap: 8px;

                    padding: 10px 18px;

                    border: 0;
                    border-radius: 18px;

                    background:
                        var(--primary-color);

                    color:
                        var(--text-primary-color);

                    font-family: inherit;
                    font-size: 14px;
                    font-weight: 700;

                    cursor: pointer;

                    transition:
                        filter 0.15s ease,
                        transform 0.15s ease;
                }


                .coach-sync-button:hover {
                    filter: brightness(1.08);

                    transform: translateY(-1px);
                }


                .coach-sync-button:active {
                    transform: translateY(0);
                }


                .coach-sync-button:disabled {
                    opacity: 0.55;

                    cursor: default;

                    transform: none;
                }




                /*
                 * HOOFDCONTAINER
                 */

                .container {
                    padding: 8px;
                }


               /*
                * TITEL
                */

                /*
                 * COACH TEAM GRID
                 */

                .coach-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            auto-fit,
                            minmax(
                                min(100%, 380px),
                                1fr
                            )
                        );

                    gap: 20px;

                    align-items: start;
                }


                /*
                 * COACH TEAM KOLOM
                 */

                .coach-team-column {
                    min-width: 0;
                }


                .coach-team-header {
                    margin-bottom: 14px;

                    padding: 12px 16px;

                    border-radius: 14px;

                    background:
                        color-mix(
                           in srgb,
                           var(--primary-color) 12%,
                           transparent
                        );

                    text-align: center;

                    font-size: 17px;
                    font-weight: 700;

                    color:
                        var(--primary-text-color);
                }


                .coach-team-matches {
                    display: flex;

                    flex-direction:column;

                    gap: 16px;
                }

                .header {
                    margin-bottom: 24px;

                    text-align: center;

                    font-size: 26px;
                    font-weight: 700;
                }


                /*
                 * RESPONSIVE GRID
                 */

                .matches-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            auto-fit,
                            minmax(
                                min(100%, 360px),
                                1fr
                            )
                        );

                    gap: 16px;

                    align-items: stretch;
                }


                /*
                 * WEDSTRIJDKAART
                 */

                ha-card.match-card {
                    position: relative;

                    display: block;

                    height: 100%;

                    padding: 20px;

                    margin: 0;

                    box-sizing: border-box;

                    border-radius: 18px;
                }


                /*
                 * VOLGENDE WEDSTRIJD
                 */

                ha-card.match-card.next-match {
                    border:
                        2px solid
                        var(--primary-color);

                    box-shadow:
                        0 0 12px
                        color-mix(
                            in srgb,
                            var(--primary-color) 25%,
                            transparent
                        );
                }

                    .followed-team-name {
                    margin-bottom: 14px;

                    text-align: center;

                    font-size: 14px;
                    font-weight: 700;

                    color:
                        var(--primary-color);
                }
           


                .next-match-badge {
                    display: inline-block;

                    margin-bottom: 14px;

                    padding: 5px 10px;

                    border-radius: 12px;

                    background:
                        var(--primary-color);

                    color:
                        var(--text-primary-color);

                    font-size: 11px;
                    font-weight: 700;

                    letter-spacing: 0.5px;

                    text-transform: uppercase;
                }


                /*
                 * MATCHUP
                 */

                .matchup {
                    display: grid;

                    grid-template-columns:
                        minmax(0, 1fr)
                        60px
                        minmax(0, 1fr);

                    align-items: center;

                    gap: 12px;
                }


                /*
                 * TEAM
                 */

                .team {
                    min-width: 0;

                    text-align: center;
                }


                .team-role {
                    margin-bottom: 8px;

                    font-size: 11px;
                    font-weight: 700;

                    letter-spacing: 0.8px;

                    text-transform: uppercase;

                    opacity: 0.65;
                }


                /*
                 * LOGO'S
                 */

                .logo-container {
                    height: 160px;

                    display: flex;

                    align-items: center;
                    justify-content: center;

                    margin-bottom: 10px;
                }


                .team-logo {
                    display: block;

                    width: 140px;
                    height: 140px;

                    max-width: 100%;

                    object-fit: contain;
                }


                .logo-placeholder {
                    width: 120px;
                    height: 120px;

                    display: flex;

                    align-items: center;
                    justify-content: center;

                    font-size: 48px;

                    opacity: 0.5;
                }


                /*
                 * TEAMNAAM
                 */

                .team-name {
                    font-size: 16px;
                    font-weight: 700;

                    line-height: 1.3;

                    white-space: normal;

                    overflow-wrap: normal;
                    word-break: normal;
                }


                /*
                 * VS
                 */

                .versus {
                    text-align: center;

                    font-size: 28px;
                    font-weight: 800;
                }


                /*
                 * WEDSTRIJDINFORMATIE
                 */

                .match-info {
                    margin-top: 20px;

                    padding-top: 16px;

                    border-top:
                        1px solid
                        var(--divider-color);

                    text-align: center;

                    line-height: 1.8;
                }


                .date-time {
                    display: flex;

                    justify-content: center;

                    flex-wrap: wrap;

                    gap: 18px;

                    font-size: 16px;
                    font-weight: 600;
                }


                .home-away {
                    margin-top: 4px;
                }


                /*
                 * LOCATIE
                 */

                .location-block {
                    margin-top: 10px;
                }


                .location {
                    font-weight: 600;
                }


                .address {
                    margin-top: 2px;

                    font-size: 13px;

                    opacity: 0.75;
                }


                /*
                 * REISINFORMATIE
                 */

                .travel-info {
                    display: flex;

                    justify-content: center;

                    flex-wrap: wrap;

                    gap: 10px 18px;

                    margin-top: 16px;

                    padding-top: 14px;

                    border-top:
                        1px solid
                        var(--divider-color);
                }


                .travel-item {
                    display: flex;

                    align-items: center;

                    gap: 6px;

                    font-size: 14px;
                }


                .travel-icon {
                    font-size: 16px;
                }


                /*
                 * PLANNING
                 */

                .planning-info {
                    margin-top: 14px;

                    padding: 12px 14px;

                    border-radius: 12px;

                    background:
                        color-mix(
                            in srgb,
                            var(--primary-color) 8%,
                            transparent
                        );
                }


                .planning-row {
                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    gap: 12px;

                    padding: 3px 0;

                    font-size: 14px;
                }


                .planning-row strong {
                    white-space: nowrap;

                    font-size: 15px;
                }


                /*
                 * NAVIGATIE
                 */

                .navigation-container {
                    display: flex;

                    justify-content: center;

                    margin-top: 16px;
                }


                .navigation-button {
                    display: inline-flex;

                    align-items: center;
                    justify-content: center;

                    min-width: 140px;

                    padding: 9px 18px;

                    border-radius: 18px;

                    background:
                        var(--primary-color);

                    color:
                        var(--text-primary-color);

                    text-decoration: none;

                    font-size: 14px;
                    font-weight: 700;

                    cursor: pointer;

                    transition:
                        filter 0.15s ease,
                        transform 0.15s ease;
                }


                .navigation-button:hover {
                    filter: brightness(1.08);

                    transform: translateY(-1px);
                }


                .navigation-button:active {
                    transform: translateY(0);
                }


                /*
                 * COMPETITIE
                 */

                .competition {
                    margin-top: 14px;

                    font-size: 13px;

                    opacity: 0.65;
                }


                /*
                 * EMPTY / ERROR
                 */

                ha-card.message-card {
                    padding: 20px;

                    text-align: center;
                }


                /*
                 * MOBIEL
                 */

                @media (max-width: 600px) {


                    .coach-grid {
                        grid-template-columns: 1fr;

                        gap: 18px;
                    }

                    .container {
                        padding: 4px;
                    }


                    .matches-grid {
                        grid-template-columns: 1fr;

                        gap: 12px;
                    }


                    ha-card.match-card {
                        padding: 14px;
                    }


                    .matchup {
                        grid-template-columns:
                            minmax(0, 1fr)
                            40px
                            minmax(0, 1fr);

                        gap: 5px;
                    }


                    .logo-container {
                        height: 110px;
                    }


                    .team-logo {
                        width: 100px;
                        height: 100px;
                    }


                    .team-name {
                        font-size: 14px;
                    }


                    .versus {
                        font-size: 20px;
                    }


                    .header {
                        margin-bottom: 16px;

                        font-size: 22px;
                    }


                    .date-time {
                        gap: 8px;

                        font-size: 14px;
                    }


                    .travel-info {
                        gap: 8px 12px;
                    }


                    .planning-info {
                        padding: 10px;
                    }


                    .planning-row {
                        gap: 8px;

                        font-size: 13px;
                    }


                    .planning-row strong {
                        font-size: 14px;
                    }


                    .address {
                        font-size: 12px;
                    }


                    .navigation-button {
                        width: 100%;

                        box-sizing: border-box;
                    }

                }

            </style>


            <div class="container">

    <div class="header">
        ${isCoachView
                ? `⚾ Tracking · ${teamCount} teams`
                : (
                    activeTeamDisplayName
                        ? (
                            `⚾ `
                            + this.escapeHtml(
                                activeTeamDisplayName
                            )
                        )
                        : "⚾ KNBSB Programma"
                )
            }
    </div>


    ${isCoachView
                ? `
                <div class="coach-actions">

                    <button
                        class="coach-sync-button"
                        id="knbsb-sync-team-views"
                        type="button"
                    >
                        🔄 Teamviews synchroniseren
                    </button>

                </div>
            `
                : ""
            }


    ${isCoachView
                ? `
                <div class="coach-grid">
                    ${cardContent}
                </div>
            `
                : `
                <div class="matches-grid">
                    ${cardContent}
                </div>
            `
            }

</div>

            </div>
        `;

        /*
* COACH SYNC BUTTON
*
* 13D.1
*
* Voorlopig alleen testen of:
*
* - de knop werkt;
* - alle actieve teams beschikbaar zijn;
* - de juiste GUIDs worden gevonden.
*
* Er wordt in deze stap nog niets
* aan het dashboard gewijzigd.
*/

        if (isCoachView) {

            const syncButton =
                this.querySelector(
                    "#knbsb-sync-team-views"
                );


            if (syncButton) {

                syncButton.onclick = async () => {

                    /*
                     * Bouw een preview van de gewenste
                     * KNBSB teamviews.
                     *
                     * Er wordt hier nog niets opgeslagen.
                     */

                    const preview =
                        this.buildTeamViewsPreview(
                            coachSchedules
                        );


                    console.group(
                        "KNBSB dashboard synchronisatie preview"
                    );


                    console.info(
                        "Aantal actieve teams:",
                        preview.length
                    );


                    preview.forEach(
                        (item) => {

                            console.group(
                                `${item.teamName} | slot ${item.slot}`
                            );

                            console.info(
                                "Club:",
                                item.clubName
                            );

                            console.info(
                                "Team:",
                                item.teamName
                            );

                            console.info(
                                "Weergavenaam:",
                                item.displayName
                            );

                            console.info(
                                "GUID:",
                                item.guid
                            );

                            console.info(
                                "Gewenste view:",
                                item.viewConfig
                            );

                            console.groupEnd();
                        }
                    );


                    /*
                     * Preview is nu volledig klaar.
                     */

                    console.info(
                        "Volledige gewenste KNBSB views:",
                        preview.map(
                            (item) =>
                                item.viewConfig
                        )
                    );

                    console.groupEnd();


                    /*
                     * NU pas dashboardconfig uitlezen.
                     */

                    try {

                        syncButton.disabled =
                            true;

                        syncButton.textContent =
                            "Dashboardconfig lezen...";


                        const dashboardUrlPath =
                            this.getDashboardUrlPath();


                        console.info(
                            "KNBSB dashboard url_path:",
                            dashboardUrlPath
                            || "(standaard Lovelace)"
                        );


                        const lovelaceConfig =
                            await this.getLovelaceConfig();


                        console.group(
                            "KNBSB huidige Lovelace configuratie"
                        );


                        console.info(
                            "Volledige configuratie:",
                            lovelaceConfig
                        );


                        const currentViews =
                            Array.isArray(
                                lovelaceConfig.views
                            )
                                ? lovelaceConfig.views
                                : [];

                        const syncPlan =
                            this.buildViewSyncPlan(
                                currentViews,
                                preview
                            );

                        /*
                         * 13D.6
                         *
                         * Bouw nieuwe dashboardconfig
                         * uitsluitend in memory.
                         *
                         * Nog niets opslaan.
                         */

                        const mergedConfig =
                            structuredClone(
                                lovelaceConfig
                            );




                        if (
                            !Array.isArray(
                                mergedConfig.views
                            )
                        ) {
                            mergedConfig.views = [];
                        }

                        const removalGuids =
                            syncPlan.removals.map(
                                (item) =>
                                    item.guid
                            );
    
                        mergedConfig.views =
                            mergedConfig.views.filter(
                                (view) => {

                                    if (
                                        !Array.isArray(
                                            view.cards
                                        )
                                    ) {
                                        return true;
                                    }

                                    const managedCard =
                                        view.cards.find(
                                            (card) =>
                                                card.type
                                                === "custom:knbsb-schedule-card"
                                                &&
                                                card.view
                                                === "team"
                                                &&
                                                card.managed_by
                                                === "knbsb"
                                        );

                                    if (!managedCard) {

                                        return true;
                                    }

                                    return !removalGuids.includes(
                                        managedCard.team
                                    );
                                }
                            );                    

                        const viewsToAdd =
                            syncPlan.additions.map(
                                (item) =>
                                    item.viewConfig
                            );


                        mergedConfig.views.push(
                            ...viewsToAdd
                        );


                        /*
                         * Veiligheidscontrole.
                         */

                        const expectedViewCount =
                            currentViews.length
                            - syncPlan.removals.length
                            + syncPlan.additions.length;


                        if (
                            mergedConfig.views.length
                            !== expectedViewCount
                        ) {
                            throw new Error(
                                "KNBSB: onverwacht aantal views na merge"
                            );
                        }


                        /*
                         * Preview van de uiteindelijke
                         * configuratie.
                         */

                        console.group(
                            "KNBSB merged dashboard preview"
                        );


                        console.info(
                            "Huidige aantal views:",
                            currentViews.length
                        );


                        console.info(
                            "Toe te voegen views:",
                            viewsToAdd.length
                        );


                        console.info(
                            "Nieuwe aantal views:",
                            mergedConfig.views.length
                        );


                        console.table(
                            mergedConfig.views.map(
                                (view, index) => ({
                                    index:
                                        index,

                                    title:
                                        view.title || "",

                                    path:
                                        view.path || "",

                                    type:
                                        view.type || "masonry",

                                    cards:
                                        Array.isArray(
                                            view.cards
                                        )
                                            ? view.cards.length
                                            : 0,
                                })
                            )
                        );




                        console.info(
                            "Volledige merged config:",
                            mergedConfig
                        );


                        console.groupEnd();




                        syncButton.textContent =
                            (
                                `OK: `
                                + `${syncPlan.additions.length} toevoegen, `
                                + `${syncPlan.existing.length} bestaand`
                            );

                        /*
 * 13D.7
 *
 * Alleen opslaan als er daadwerkelijk
 * ontbrekende teamviews zijn.
 */

                        const hasChanges =
                            syncPlan.additions.length > 0
                            ||
                            syncPlan.removals.length > 0;


                        if (!hasChanges) {

                            console.info(
                                "KNBSB: geen dashboardwijzigingen nodig"
                            );


                            syncButton.textContent =
                                `OK: ${syncPlan.existing.length} teamviews zijn actueel`;


                            window.setTimeout(
                                () => {

                                    syncButton.disabled =
                                        false;

                                    syncButton.textContent =
                                        "Teamviews synchroniseren";

                                },
                                3000
                            );


                            return;
                        }


                        /*
                         * Dashboard opslaan.
                         */

                        syncButton.textContent =
                            "Teamviews opslaan...";


                        console.info(
                            "KNBSB: dashboardconfig wordt opgeslagen",
                            {
                                additions:
                                    syncPlan.additions.length,

                                currentViews:
                                    currentViews.length,

                                newViews:
                                    mergedConfig.views.length,
                            }
                        );


                        await this.saveLovelaceConfig(
                            mergedConfig
                        );


                        /*
                         * Config opnieuw uitlezen
                         * om de save te controleren.
                         */

                        const verifyConfig =
                            await this.getLovelaceConfig();


                        const verifyViews =
                            Array.isArray(
                                verifyConfig.views
                            )
                                ? verifyConfig.views
                                : [];


                        /*
                         * Controleer het aantal views.
                         */

                        if (
                            verifyViews.length
                            !== mergedConfig.views.length
                        ) {
                            throw new Error(
                                "KNBSB: verificatie van het aantal dashboardviews is mislukt"
                            );
                        }


                        /*
                         * Verzamel alle KNBSB team GUIDs
                         * uit de opgeslagen managed views.
                         */

                        const savedTeamGuids =
                            verifyViews
                                .flatMap(
                                    (view) =>
                                        Array.isArray(
                                            view.cards
                                        )
                                            ? view.cards
                                            : []
                                )
                                .filter(
                                    (card) =>
                                        card.type
                                        === "custom:knbsb-schedule-card"
                                        &&
                                        card.view
                                        === "team"
                                        &&
                                        card.managed_by
                                        === "knbsb"
                                )
                                .map(
                                    (card) =>
                                        card.team
                                );


                        /*
                         * Controleer of ieder actief team
                         * teruggevonden wordt.
                         */

                        const missingGuids =
                            preview
                                .map(
                                    (item) =>
                                        item.guid
                                )
                                .filter(
                                    (guid) =>
                                        !savedTeamGuids.includes(
                                            guid
                                        )
                                );


                        if (
                            missingGuids.length > 0
                        ) {
                            throw new Error(
                                "KNBSB: niet alle teamviews zijn na opslaan teruggevonden"
                            );
                        }


                        /*
                         * Synchronisatie gelukt.
                         */

                        console.info(
                            "KNBSB: dashboard succesvol gesynchroniseerd",
                            {
                                teamViews:
                                    savedTeamGuids.length,

                                totalViews:
                                    verifyViews.length,
                            }
                        );


                        syncButton.textContent =
                            `OK: ${savedTeamGuids.length} teamviews gesynchroniseerd`;


                        window.setTimeout(
                            () => {

                                syncButton.disabled =
                                    false;

                                syncButton.textContent =
                                    "Teamviews synchroniseren";

                            },
                            4000
                        );


                        window.setTimeout(
                            () => {

                                syncButton.disabled =
                                    false;

                                syncButton.textContent =
                                    "Teamviews synchroniseren";

                            },
                            3000
                        );

                    } catch (error) {
 
                        console.error(
                            "KNBSB: dashboard synchronisatie mislukt",
                            error
                        );
 
                        syncButton.disabled =
                            false;
 
                        syncButton.textContent =
                            "Synchronisatie mislukt";
 
                        window.setTimeout(
                            () => {
 
                                syncButton.textContent =
                                    "Teamviews synchroniseren";
 
                            },
                            3000
                        );
                    }

                };

            }

        /*
         * COACH TEAM HEADERS
         *
         * Klik op een teamnaam om naar
         * de bijbehorende teamview te gaan.
         */

        const teamHeaders =
            this.querySelectorAll(
                ".coach-team-header"
            );

        teamHeaders.forEach(
            (header) => {

                header.onclick = () => {

                    const teamSlot =
                        Number(
                            header.dataset.teamSlot
                        );

                    const schedule =
                        coachSchedules.find(
                            (item) =>
                                Number(
                                    item.teamSlot
                                )
                                === teamSlot
                        );

                    if (!schedule) {

                        console.error(
                            "KNBSB: team niet gevonden voor navigatie",
                            teamSlot
                        );

                        return;
                    }

                    this.navigateToTeamView(
                        schedule
                    );
                };
            }
        );

    }
}

    /*  EINDE SET HASS */

    /* HELPERS */

    formatDuration(minutes) {

        if (
            minutes === null
            || minutes === undefined
            || isNaN(minutes)
        ) {
            return "";
        }

        const hours =
            Math.floor(
                minutes / 60
            );

        const remainingMinutes =
            minutes % 60;

        if (hours === 0) {
            return `${minutes} min`;
        }

        if (remainingMinutes === 0) {
            return `${hours} uur`;
        }

        return (
            `${hours} uur `
            + `${remainingMinutes} min`
        );
    }

    navigateToTeamView(
        schedule
    ) {

        const dashboardPath =
            this.getDashboardUrlPath();


        const teamPath =
            this.getTeamViewPath(
                schedule
            );


        const targetPath =
            dashboardPath
                ? `/${dashboardPath}/${teamPath}`
                : `/lovelace/${teamPath}`;


        history.pushState(
            null,
            "",
            targetPath
        );


        window.dispatchEvent(
            new Event(
                "location-changed"
            )
        );
    }

    getTeamViewPath(
        schedule
    ) {

        return (
            `knbsb-team-${schedule.teamSlot}`
        );
    }

    getDashboardUrlPath() {

        const path =
            window.location.pathname;


        const parts =
            path
                .split("/")
                .filter(
                    (part) => part
                );


        if (
            parts.length === 0
        ) {
            return null;
        }


        const dashboardPath =
            parts[0];


        if (
            dashboardPath === "lovelace"
        ) {
            return null;
        }


        return dashboardPath;
    }

    buildTeamViewConfig(schedule) {

        const teamTitle =
            schedule.teamName
            || schedule.teamDisplayName
            || `KNBSB Team ${schedule.teamSlot}`;


        const teamPath =
            `knbsb-team-${schedule.teamSlot}`;


        return {

            title:
                teamTitle,

            path:
                teamPath,

            type:
                "masonry",

            cards: [
                {
                    type:
                        "custom:knbsb-schedule-card",

                    view:
                        "team",

                    team:
                        schedule.teamGuid,

                    managed_by:
                        "knbsb",
                },
            ],
        };
    }

    buildTeamViewsPreview(
        schedules
    ) {

        return schedules.map(
            (schedule) => ({

                slot:
                    schedule.teamSlot,

                guid:
                    schedule.teamGuid,

                clubName:
                    schedule.clubName,

                teamName:
                    schedule.teamName,

                displayName:
                    schedule.teamDisplayName,

                viewConfig:
                    this.buildTeamViewConfig(
                        schedule
                    ),
            })
        );
    }

    buildViewSyncPlan(
        currentViews,
        preview
    ) {

        const additions = [];
        const existing = [];
        const unmanaged = [];
        const removals = [];

        /*
         * Zoek bestaande KNBSB managed
         * teamviews.
         */

        const managedViews =
            currentViews.filter(
                (view) => {

                    if (
                        !Array.isArray(
                            view.cards
                        )
                    ) {
                        return false;
                    }


                    return view.cards.some(
                        (card) =>
                            card.type
                            === "custom:knbsb-schedule-card"
                            &&
                            card.view
                            === "team"
                            &&
                            card.managed_by
                            === "knbsb"
                    );
                }
            );

        const activeGuids =
            preview.map(
                (item) =>
                    item.guid
            );


        /*
         * Vergelijk ieder gewenst team
         * met de huidige managed views.
         *
         * GUID is onze identiteit.
         */

        preview.forEach(
            (item) => {

                const foundView =
                    managedViews.find(
                        (view) => {

                            return view.cards.some(
                                (card) =>
                                    card.type
                                    === "custom:knbsb-schedule-card"
                                    &&
                                    card.view
                                    === "team"
                                    &&
                                    card.managed_by
                                    === "knbsb"
                                    &&
                                    card.team
                                    === item.guid
                            );
                        }
                    );


                if (foundView) {

                    existing.push({
                        team:
                            item.teamName,

                        guid:
                            item.guid,

                        currentView:
                            foundView,

                        wantedView:
                            item.viewConfig,
                    });

                } else {

                    additions.push({
                        team:
                            item.teamName,

                        guid:
                            item.guid,

                        viewConfig:
                            item.viewConfig,
                    });
                }
            }
        );

        managedViews.forEach(
            (view) => {

                const managedCard =
                    view.cards.find(
                        (card) =>
                            card.type
                            === "custom:knbsb-schedule-card"
                            &&
                            card.view
                            === "team"
                            &&
                            card.managed_by
                            === "knbsb"
                    );

                if (!managedCard) {
                    return;
                }

                const guid =
                    managedCard.team;

                if (
                    !activeGuids.includes(
                        guid
                    )
                ) {

                    removals.push({
                        guid:
                            guid,

                        title:
                            view.title || "",

                        path:
                            view.path || "",

                        view:
                            view,
                    });
                }
            }
        );

        /*
         * Alles wat niet door KNBSB wordt
         * beheerd laten we ongemoeid.
         */

        currentViews.forEach(
            (view) => {

                const isManaged =
                    managedViews.includes(
                        view
                    );


                if (!isManaged) {

                    unmanaged.push(
                        view
                    );
                }
            }
        );


        return {
            additions,
            existing,
            unmanaged,
            managedViews,
            removals,
        };
    }

    renderTeamColumn(schedule) {

        const teamDisplayName =
            this.escapeHtml(
                schedule.teamDisplayName
                || schedule.teamName
                || schedule.entityId
                || "KNBSB Team"
            );


        /*
         * Kopieer de wedstrijden zodat we
         * de originele HA-state niet aanpassen.
         */

        const matches = [
            ...(schedule.matches || [])
        ];


        /*
         * Wedstrijden binnen dit team
         * chronologisch sorteren.
         */

        matches.sort(
            (a, b) => {

                const dateA =
                    new Date(
                        `${a.date}T${a.time || "00:00"}`
                    );

                const dateB =
                    new Date(
                        `${b.date}T${b.time || "00:00"}`
                    );

                return dateA - dateB;
            }
        );


        /*
         * Teammetadata toevoegen aan
         * iedere wedstrijd.
         */

        const matchCards =
            matches
                .map(
                    (match, index) => {

                        const enrichedMatch = {

                            ...match,

                            followed_team_slot:
                                schedule.teamSlot,

                            followed_team_guid:
                                schedule.teamGuid,

                            followed_club_name:
                                schedule.clubName,

                            followed_team_name:
                                schedule.teamName,

                            followed_team_display_name:
                                schedule.teamDisplayName,
                        };


                        return this.renderMatch(
                            enrichedMatch,

                            /*
                             * Iedere teamkolom heeft
                             * zijn eigen volgende wedstrijd.
                             */
                            index === 0
                        );
                    }
                )
                .join("");


        return `

        <div class="coach-team-column">

            <div
                class="coach-team-header"
                data-team-slot="${this.escapeAttribute(
                    schedule.teamSlot
                )}"
            >
                <span>
                    ${teamDisplayName}
                </span>

                <span class="coach-team-link-icon">
                    >
                </span>
            </div>


            <div class="coach-team-matches">

                ${matchCards
            || `
                        <ha-card class="message-card">
                            Geen geplande wedstrijden
                        </ha-card>
                    `
            }

            </div>

        </div>
    `;
    }

    async getLovelaceConfig() {

        if (
            !this._hass
            ||
            !this._hass.connection
        ) {
            throw new Error(
                "Home Assistant verbinding is niet beschikbaar"
            );
        }


        const urlPath =
            this.getDashboardUrlPath();


        const message = {
            type:
                "lovelace/config",
        };


        if (urlPath) {
            message.url_path =
                urlPath;
        }


        return await this._hass.connection.sendMessagePromise(
            message
        );
    }

    async saveLovelaceConfig(
        config
    ) {

        if (
            !this._hass
            ||
            !this._hass.connection
        ) {
            throw new Error(
                "Home Assistant verbinding is niet beschikbaar"
            );
        }


        const urlPath =
            this.getDashboardUrlPath();


        const message = {
            type:
                "lovelace/config/save",

            config:
                config,
        };


        if (urlPath) {

            message.url_path =
                urlPath;
        }


        return await this._hass.connection.sendMessagePromise(
            message
        );
    }

    renderMatch(
        match,
        isNextMatch = false
    ) {


    /*
     * THUIS LINKS
     * UIT RECHTS
     */

        const homeTeamName =
            this.escapeHtml(
                match.home_team_name ||
                "Thuisteam"
            );


        const awayTeamName =
            this.escapeHtml(
                match.away_team_name ||
                "Uitteam"
            );


        const homeTeamLogo =
            this.normalizeUrl(
                match.home_team_logo
            );


        const awayTeamLogo =
            this.normalizeUrl(
                match.away_team_logo
            );


        /*
         * LOGO OPBOUW
         */

        let homeTeamLogoHtml;


        if (homeTeamLogo) {

            homeTeamLogoHtml =
                '<img ' +
                'class="team-logo" ' +
                'src="' +
                this.escapeAttribute(
                    homeTeamLogo
                ) +
                '" ' +
                'alt="' +
                this.escapeAttribute(
                    homeTeamName
                ) +
                ' logo" ' +
                'loading="lazy" ' +
                '>';

        } else {

            homeTeamLogoHtml = `
                <div class="logo-placeholder">
                    ⚾
                </div>
            `;
        }


        let awayTeamLogoHtml;


        if (awayTeamLogo) {

            awayTeamLogoHtml =
                '<img ' +
                'class="team-logo" ' +
                'src="' +
                this.escapeAttribute(
                    awayTeamLogo
                ) +
                '" ' +
                'alt="' +
                this.escapeAttribute(
                    awayTeamName
                ) +
                ' logo" ' +
                'loading="lazy" ' +
                '>';

        } else {

            awayTeamLogoHtml = `
                <div class="logo-placeholder">
                    ⚾
                </div>
            `;
        }


        /*
         * BASISGEGEVENS
         */

        const date =
            this.escapeHtml(
                match.date || ""
            );


        const time =
            this.escapeHtml(
                match.time || ""
            );


        const homeAway =
            this.escapeHtml(
                match.home_away || ""
            );


        const location =
            this.escapeHtml(
                match.location || ""
            );


        const address =
            this.escapeHtml(
                match.address || ""
            );


        const competition =
            this.escapeHtml(
                match.competition || ""
            );


        /*
         * REISGEGEVENS
         */

        const driveDistance =
            (
                match.drive_distance !== null &&
                match.drive_distance !== undefined
            )
                ? this.escapeHtml(
                    match.drive_distance
                )
                : "";


        const driveTime =
            (
                match.drive_time !== null &&
                match.drive_time !== undefined
            )
                ? this.escapeHtml(
                    match.drive_time
                )
                : "";


        const arrivalTime =
            this.escapeHtml(
                match.arrival_time || ""
            );


        const departureTime =
            this.escapeHtml(
                match.departure_time || ""
            );


        /*
         * COORDINATEN
         */

        const latitude =
            match.latitude;


        const longitude =
            match.longitude;


        const hasCoordinates =
            latitude !== null &&
            latitude !== undefined &&
            longitude !== null &&
            longitude !== undefined;


        /*
         * GOOGLE MAPS NAVIGATIE
         */

        const navigationUrl =
            hasCoordinates
                ? (
                    "https://www.google.com/maps/dir/?api=1" +
                    "&destination=" +
                    encodeURIComponent(
                        `${latitude},${longitude}`
                    ) +
                    "&travelmode=driving"
                )
                : "";


        /*
         * WEDSTRIJDKAART
         */

        return `

            <ha-card
                class="
                    match-card
                    ${isNextMatch
                ? "next-match"
                : ""
            }
                "
            >


                ${
                    isNextMatch
                        ? `
                    <div class="next-match-badge">
                        VOLGENDE WEDSTRIJD
                    </div>
                `
                        : ""
        }


                <div class="matchup">


                    <!-- THUIS -->


                    <div class="team">

                        <div class="team-role">
                            THUIS
                        </div>


                        <div class="logo-container">
                            ${homeTeamLogoHtml}
                        </div>


                        <div class="team-name">
                            ${homeTeamName}
                        </div>

                    </div>


                    <!-- VS -->


                    <div class="versus">
                        VS
                    </div>


                    <!-- UIT -->


                    <div class="team">

                        <div class="team-role">
                            UIT
                        </div>


                        <div class="logo-container">
                            ${awayTeamLogoHtml}
                        </div>


                        <div class="team-name">
                            ${awayTeamName}
                        </div>

                    </div>


                </div>


                <div class="match-info">


                    <!-- DATUM / TIJD -->


                    <div class="date-time">

                        <span>
                            🗓️ ${date}
                        </span>

                        <span>
                            🕒 ${time}
                        </span>

                    </div>

                    <!-- LOCATIE -->

                    <div class="location-block">

                        <div class="location">
                            📍 ${location}
                        </div>


                        ${address
                ? `
                                    <div class="address">
                                        ${address}
                                    </div>
                                `
                : ""
            }

                    </div>


                    <!-- AFSTAND / RIJTIJD -->


                    ${driveDistance || driveTime
                ? `
                                <div class="travel-info">


                                    ${driveDistance
                    ? `
                                                <div class="travel-item">

                                                    <span class="travel-icon">
                                                        🚗
                                                    </span>

                                                    <span>
                                                        ${driveDistance} km
                                                    </span>

                                                </div>
                                            `
                    : ""
                }


                                    ${driveTime
                    ? `
                                                <div class="travel-item">

                                                    <span class="travel-icon">
                                                        ⏱️
                                                    </span>

                                                    <span>
                                                        ${this.formatDuration(
                                                            match.drive_time
                                                        )}
                                                    </span>

                                                </div>
                                            `
                    : ""
                }


                                </div>
                            `
                : ""
            }


                    <!-- PLANNING -->


                    ${arrivalTime || departureTime
                ? `
                                <div class="planning-info">


                                    ${arrivalTime
                    ? `
                                                <div class="planning-row">

                                                    <span>
                                                        ✅ Geplande aankomst
                                                    </span>

                                                    <strong>
                                                        ${arrivalTime}
                                                    </strong>

                                                </div>
                                            `
                    : ""
                }


                                    ${departureTime
                    ? `
                                                <div class="planning-row">

                                                    <span>
                                                        🚙 Vertrek vanaf huis
                                                    </span>

                                                    <strong>
                                                        ${departureTime}
                                                    </strong>

                                                </div>
                                            `
                    : ""
                }


                                </div>
                            `
                : ""
            }


                    <!-- NAVIGATIE -->


                    ${navigationUrl
                ? `
                                <div class="navigation-container">

                                    <a
                                        class="navigation-button"
                                        href="${navigationUrl}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        📍 Navigeer
                                    </a>

                                </div>
                            `
                : ""
            }


                    <!-- COMPETITIE -->


                    ${competition
                ? `
                                <div class="competition">
                                    ${competition}
                                </div>
                            `
                : ""
            }


                </div>


            </ha-card>
        `;
    }

    normalizeUrl(value) {

        if (!value) {
            return "";
        }


        const url =
            String(value).trim();


        if (
            url.startsWith(
                "https://"
            ) ||
            url.startsWith(
                "http://"
            )
        ) {
            return url;
        }


        return "";
    }

    escapeHtml(value) {

        return String(value)

            .replaceAll(
                "&",
                "&amp;"
            )

            .replaceAll(
                "<",
                "&lt;"
            )

            .replaceAll(
                ">",
                "&gt;"
            )

            .replaceAll(
                '"',
                "&quot;"
            )

            .replaceAll(
                "'",
                "&#039;"
            );
    }

    escapeAttribute(value) {

        return this.escapeHtml(
            value
        );
    }

    getCardSize() {

        return 6;
    }

    static getStubConfig() {

        return {
            view: "coach",
        };
    }

}


if (
    !customElements.get(
        "knbsb-schedule-card"
    )
) {

    customElements.define(
        "knbsb-schedule-card",
        KNBSBScheduleCard
    );
}


window.customCards =
    window.customCards || [];


window.customCards.push({

    type:
        "knbsb-schedule-card",

    name:
        "KNBSB Schedule Card",

    description:
        "KNBSB programma met reistijd, planning, automatische team discovery en navigatie."

});