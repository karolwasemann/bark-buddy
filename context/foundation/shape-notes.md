---
project: "BarkBuddy"
context_type: greenfield
created: 2026-05-24
updated: 2026-05-24
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "coordination overhead + missing capability"
    - topic: "insight"
      decision: "hyper-locality by walking area; match by time+place ('here and now') rather than static profile; dog-to-dog matching prioritized alongside human-to-human"
    - topic: "primary persona scope"
      decision: "urban apartment-dweller without a garden, with an energetic dog needing off-leash exercise"
    - topic: "auth strategy"
      decision: "email + password in v1; OAuth (provider set TBD) deferred to v2"
    - topic: "role model"
      decision: "flat user model; no admin/moderator roles in MVP"
    - topic: "MVP scope-down"
      decision: "drop OAuth (→email+password), drop real-time chat (→async invite/accept/free-text inbox), drop polygon area drawing (→pin+radius), drop time-window matching (→naive overlap area); keep dog photos"
    - topic: "primary success metric"
      decision: "≥1 pair of users exchanged contact via app and confirmed an offline walk within 14 days of deploy"
    - topic: "secondary success metric"
      decision: "users self-report (30-day survey) that they met someone new thanks to the app"
    - topic: "guardrails"
      decision: "location privacy (exact coordinates don't leak); time-to-first-match < 5min for fresh user in populated area"
    - topic: "messaging shape"
      decision: "FR-008 split into invite (FR-008) + accept/decline (FR-013) + free-text after acceptance (FR-014); structured invite gates the first contact"
    - topic: "edit scope"
      decision: "FR-010 promoted to must-have, deliberately narrowed to display name + dog name (typo fix only)"
    - topic: "dog photo priority"
      decision: "FR-011 promoted to must-have; dog photo is decision-driver for the match"
    - topic: "user profile depth"
      decision: "FR-003 expanded to display name + short bio in v1; year-of-birth and user profile photo deferred to v2"
    - topic: "matching rule"
      decision: "match = overlap area ≥ 10% of the smaller of the two circles; sort by pin-to-pin distance ascending"
    - topic: "match opacity to users"
      decision: "users never see another user's pin, radius, or overlap percentage; matching is opaque on the user-facing surface"
    - topic: "dog photo visibility"
      decision: "visible only to active matches; never to non-matched users, unauthenticated visitors, or public URLs"
    - topic: "response-time floor"
      decision: "<1s visible response per action; >2s shows continuous progress"
  frs_drafted: 14
  quality_check_status: accepted
---

# Shape Notes — BarkBuddy

## Seed idea (verbatim, from idea-notes.md)

```
# BarkBuddy

### Główny problem
Posiadacze psów sami chodza na spacerya ich pieski nie socjalizuja sie z psimi przyjacielami z okolicy. Ludzie jedynie sie mijają i witają.

### Najmniejszy zestaw funkcjonalności
- Tworzenie profilu psa oraz uzytkownika wraz ze zdjeciem rasa
- wyznaczanie na mapie obszaru w ktorym wlasciciel spaceruje z psem
- Matchowanie na podstawie wyznaczonego obszaru spaceru
- live chat lub inna forma integracji z zmachtowanymi osobami w celu zaaranzowania spotkania wlascicieli oraz psow

### co nie wchodzi w zakres MVP
- zdobywanie odznak
- plan platny
- mozliwosc zapraszania znajomych
- live tracking
- sekcja umawiania treningu z trenerami lub behawiorystami

### kryteria sukcesu
- Posiadacze czworonogów umawiają sie na wspólne spacery
- Mozliwosc poznwania nowych ludzi w nowych miejscach
```

## Vision & Problem Statement

Miejscy właściciele psów mieszkający w blokach, bez własnego ogrodu, mają psy, które potrzebują regularnej zabawy bez smyczy z innymi psami w okolicy. Na codziennych spacerach pies ciągnie do każdego mijanego psa, a właściciele jedynie kiwają sobie głową i idą dalej — nie istnieje żaden lekki sposób, by uzgodnić "spotkajmy się jutro o 18:00 w parku, puścimy psy razem ze smyczy". W efekcie pies wraca z dnia na dzień niezasocjalizowany i niezaspokojony, a właściciel — bez znajomości w lokalnej psiarskiej społeczności.

Insight, który czyni ten projekt wartym napisania PRD: istniejące rozwiązania (globalne aplikacje psie, lokalne grupy społecznościowe) matchują "po mieście" i statycznie — po profilu psa. Tymczasem ból dotyczy konkretnej trasy spacerowej (promień ~15 min pieszo) i konkretnego okna czasowego ("jestem teraz w okolicy do określonej godziny"). Dopasowanie powinno odbywać się na poziomie obszaru spaceru i okna "tu i teraz", a w doborze partnerów psy są traktowane jako pierwszorzędny wymiar — ludzie są dodatkiem, choć też się poznają.

## User & Persona

**Miejski właściciel psa w bloku** — mieszka w mieszkaniu, nie ma ogrodu ani własnej przestrzeni, w której pies mógłby się wybiegać. Pies jest energiczny i potrzebuje regularnego ruchu poza smyczą oraz kontaktu z innymi psami, żeby był zrównoważony. Właściciel sięga po aplikację, gdy widzi, że codzienne mijanki na ulicy nie wystarczają — pies wraca z spaceru sfrustrowany, a sam właściciel coraz bardziej czuje, że psiarska społeczność wokół niego "istnieje, ale jest niedostępna".

## Success Criteria

### Primary

- Co najmniej 1 para użytkowników wymieniła kontakt przez aplikację i potwierdziła wspólny offline spacer w ciągu 14 dni od deployu.

### Secondary

- Użytkownicy raportują (w prostej ankiecie 30 dni po rejestracji), że poznali kogoś nowego dzięki aplikacji.

### Guardrails

- Prywatność lokalizacji — dokładna pozycja domu / pinezki użytkownika nie wycieka publicznie ani do innych użytkowników; ujawniany jest tylko obszar / przybliżenie wystarczające do oceny nakładania się.
- Czas od rejestracji do pierwszego matcha < 5 minut dla świeżego użytkownika w obszarze, w którym są już inni użytkownicy.


## Access Control

Aplikacja jest multi-user. W MVP autentykacja odbywa się przez **email + hasło** — klasyczny formularz rejestracji i logowania. OAuth-based sign-in z zewnętrznymi dostawcami został świadomie odsunięty do v2 jako część scope-down podjętego w Step 3 — pierwszorzędne jest dotarcie do działającego matchowania, dodatkowi providerzy logowania nie wnoszą wartości użytkownikowi w pierwszej wersji.

Model ról jest **płaski**: każdy zalogowany użytkownik ma takie same uprawnienia — może utworzyć profil swój i swojego psa, wyznaczyć obszar spaceru, dostać match, otworzyć kontakt z dopasowaną osobą. W MVP nie ma roli administratora ani moderatora w UI; ewentualne ręczne interwencje (banowanie, zgłoszenia) są poza zakresem MVP.

Sign-up i sign-in są dwoma osobnymi formularzami (rejestracja: email + hasło + powtórzenie hasła; logowanie: email + hasło). Niezalogowany użytkownik odwiedzający dowolny gated widok (profil, mapa, lista matchy, kontakt) jest przekierowywany do ekranu logowania.

## Functional Requirements

### Authentication
- FR-001: User can register an account using email + password. Priority: must-have
  > Socrates: Counter-arguments considered (reset-password flow load; OAuth conversion lift; fake-account pollution). None accepted. FR-001 stands as the smallest auth that gives the system a stable identity for matching.
- FR-002: User can log in with email + password and log out. Priority: must-have
  > Socrates: Counter-arguments considered (logout rarely used in mobile-web; logout-required for shared-device privacy; token-revocation infrastructure cost). None accepted. FR-002 stands.

### Profile
- FR-003: User can create their own profile (display name + short bio). Priority: must-have
  > Socrates: Counter-argument considered: "display name alone makes the match blind — the second user has nothing to base a 'do I want to meet this person' judgment on." Resolution: FR-003 expanded to include a short bio (free-text) in v1; year-of-birth and user profile photo deferred to v2 to keep the 2-week timeline.
- FR-004: User can create a profile for their dog (name, breed — text only). Priority: must-have
  > Socrates: Counter-arguments considered (free-text breed fragments future matching; missing size/age/temperament metadata leaves dog match blind; breed irrelevance for the energetic-block-dweller persona). None accepted. FR-004 stands; richer dog metadata deferred to v2.
- FR-010: User can edit their display name and their dog's name after initial creation. Priority: must-have
  > Socrates: Counter-argument considered: "without edit, a typo at registration traps the user until v2 — they reject the app immediately." Resolution: promoted from nice-to-have to must-have; scope deliberately narrowed to display name + dog name (typo fixes). Edits to bio, breed, pin, radius remain out of MVP scope.
- FR-011: User can attach a photo to their dog's profile. Priority: must-have
  > Socrates: Counter-argument considered: "without a dog photo, the app stops being a dog app and becomes 'Tinder for owners' — the persona's primary motivation evaporates and conversion to first match collapses." Resolution: promoted from nice-to-have to must-have.

### Map & Matching
- FR-005: User can place a pin on a map and set a radius around it to mark their walking area. Priority: must-have
  > Socrates: Counter-arguments considered (real walking area is a corridor not a circle; users won't know a sane default radius and will pick too big/too small; one pin per user can't model the typical 2-3 stable routes). None accepted. FR-005 stands as the simplest first model; richer area shape and multi-pin support deferred to v2.
- FR-006: User can view a list of other users whose walking-area circles overlap with theirs. Priority: must-have
  > Socrates: Counter-arguments considered (no minimum-overlap threshold treats 1cm overlap = 100% overlap, generating false positives; no list size limit floods user in dense areas; symmetric vs. asymmetric discovery between A and B has privacy implications). None accepted. FR-006 stands; refinements deferred to v2.
- FR-007: User can open a match's details to see their profile and their dog's profile. Priority: must-have
  > Socrates: Counter-arguments considered (full profile devalues the offline meeting; swipe-style UI would be faster; full profile is necessary for any informed decision). None accepted. FR-007 stands as the simplest detail view.
- FR-012: User can filter or sort the match list (e.g. by distance, by dog size). Priority: nice-to-have
  > Socrates: Counter-arguments considered (default sort insufficient in dense areas; "nice-to-have" framing collides with high-density UX; no v1 metadata exists to filter on — size/age/availability not collected). None accepted. FR-012 stays nice-to-have; if v1 launches in a high-density area and matches flood the list, this FR moves up.

### Messaging
- FR-008: User can send a pre-formatted walk-invitation (place, date, time) to a matched user. Priority: must-have
  > Socrates: Counter-argument considered: "an open free-text inbox lets the very first message be anything — a compliment, a pickup, an aggression — and ruins early-user UX before any moderation tools exist." Resolution: original FR-008 split into three FRs — FR-008 captures the structured invitation (gates the first contact through a known shape); FR-013 captures accept/decline; FR-014 captures free-text only after acceptance.
- FR-013: User can accept or decline an incoming walk-invitation. Priority: must-have
  > Socrates: Introduced as part of FR-008's split; no separate counter-argument round. Captures the recipient's gating action — declining ends the thread; accepting unlocks free-text exchange (FR-014).
- FR-014: User can exchange free-text asynchronous messages with another user once that user has accepted a walk-invitation (in either direction). Priority: must-have
  > Socrates: Introduced as part of FR-008's split; no separate counter-argument round. Captures the post-acceptance free-text channel — the place where coordination of the actual meeting happens.
- FR-009: User can read incoming asynchronous messages (invitations and free-text) from matched users in their inbox. Priority: must-have
  > Socrates: Counter-arguments considered (no notification = inbox-of-dead-messages; missing conversation-list UI for N×N threads; no read-receipts means user can't tell silence from blindness). None accepted. FR-009 stands as written for v1; the lack of notifications is an acknowledged risk to the 14-day primary outcome and is logged in Open Questions for v2.

## User Stories

### US-01: User finds a match in their walking area and reaches out

- **Given** a logged-in user with a personal profile, a dog profile (with photo), and a walking-area pin + radius set on the map
- **When** they open the matches view
- **Then** they see a list of other users whose walking areas overlap with theirs, ordered from closest pin to farthest, and can tap any of them to view full details and send a pre-formatted walk-invitation (place, date, time)

#### Acceptance Criteria
- An empty match list (no overlapping users) shows an explanatory empty-state, not a blank screen.
- The match list excludes the user themselves.
- Sending an invitation persists it; the recipient sees it the next time they open their inbox and can accept or decline.
- Once the recipient accepts, both parties can exchange free-text messages in their inbox.
- The exact pin coordinates of any user are NEVER displayed to other users — only an abstract overlap indicator.

## Business Logic

Dla każdego zalogowanego użytkownika A aplikacja wyznacza zbiór matchy jako wszystkich innych użytkowników B, których koło spaceru (pinezka B + promień B) ma przecięcie z kołem spaceru A o powierzchni co najmniej 10% pola mniejszego z dwóch kół, i prezentuje ten zbiór posortowany rosnąco po odległości pinezka-pinezka.

Reguła konsumuje trzy user-facing inputy: pinezkę usera A, jego promień (oba ustawione w widoku mapy), oraz analogiczne dane innych aktywnych userów. Output dla A jest uporządkowaną listą innych userów wraz z ich profilami i profilami ich psów (w zakresie widocznym dla matchy — patrz NFR niżej). Próg 10% mniejszego z dwóch kół chroni przed fałszywie pozytywnymi matchami przy minimalnej styczności obszarów oraz traktuje obu userów symetrycznie niezależnie od tego, jak duże są ich indywidualne promienie.

User spotyka się z tą regułą wyłącznie poprzez efekt — listę matchy w widoku "Matches". Sama mechanika (overlap, geometria, próg, sortowanie) jest dla niego nieprzezroczysta: nie widzi cudzej pinezki, cudzego promienia ani procentu nakładania się obszarów. Po jego stronie reguła objawia się jako "oto userzy, których obszar spaceru pokrywa się z twoim na tyle, że ma sens się umówić".

## Non-Functional Requirements

- **Privacy lokalizacji (strong):** użytkownik nigdy nie widzi pinezki, promienia ani procentu overlap'u innego użytkownika. Jedyny ujawniany fakt to "ten user jest twoim matchem". Dokładne współrzędne pinezki dowolnego użytkownika nie są ujawniane przez żadne user-facing API ani publiczny endpoint.
- **Privacy zdjęć psa:** zdjęcie psa użytkownika B jest widoczne wyłącznie userowi A, który jest aktywnym matchem dla B. Nie jest widoczne dla niezalogowanych odwiedzających, dla zalogowanych userów spoza zbioru matchy ani publicznie dostępne pod żadnym URL bez weryfikacji aktywnego matcha.
- **Time-to-first-match:** świeży użytkownik w obszarze, w którym są już inni aktywni użytkownicy, widzi przynajmniej jeden potencjalny match w mniej niż 5 minut od ukończenia rejestracji + utworzenia profilu siebie i psa + ustawienia pinezki na mapie.
- **Response time użytkownika:** każda akcja użytkownika (kliknięcie, submit formularza, otwarcie widoku) daje widoczne potwierdzenie w mniej niż 1 sekundę; jakakolwiek operacja przekraczająca 2 sekundy pokazuje użytkownikowi widoczną, ciągłą oznakę trwającej operacji.
- **Browser support:** aplikacja pozostaje użyteczna na najnowszych dwóch głównych wersjach Chrome, Firefox, Safari oraz Edge.

## Non-Goals

- **Live tracking / GPS śledzenie psów w czasie rzeczywistym** — MVP łączy ludzi po statycznym obszarze spaceru, nie pokazuje ruchu pinezki na żywo. Realtime pozycjonowanie ma istotne implikacje prywatnościowe i kosztowe; odsunięte do v2+.
- **Zdobywanie odznak, gamifikacja, streaki** — MVP nie ma systemu nagród. Wartość przychodzi z faktu spotkania, nie z dopaminy w apce.
- **Plan płatny, subskrypcje, jakakolwiek monetyzacja** — MVP jest darmowy. Walidacja problemu poprzedza walidację modelu biznesowego.
- **Zapraszanie znajomych, system poleceń, growth loops** — User dołącza sam, organicznie. Mechaniki growth idą po MVP, gdy core flow działa.
- **Integracja z trenerami i behawiorystami** — Apka łączy psy z innymi psami / ludzi z innymi ludźmi, nie z usługami profesjonalnymi.
- **Budowanie własnej algorytmiki kompatybilności psów** (np. ML-based dopasowanie temperamentów ras) — MVP używa naive geometrii kół; ranking po dystansie pinezek. Inteligentne dopasowanie wymaga danych, których nie ma w v1.
- **Powiadomienia push, email, SMS** o nowej wiadomości w inbox'ie — Inbox jest pull-based; user musi otworzyć apkę. Powiadomienia są znanym ryzykiem dla 14-dniowego primary outcome i logowane w Open Questions, ale infrastruktura push/email out-of-MVP.
- **Moderacja społeczności: report-button, blokowanie userów, system zgłoszeń** — W MVP flat user model bez admina; akceptowane ryzyko, że pierwszy zły aktor uderzy w UX kilku userów. Moderation tooling wraca w v2 razem z report flow.
- **Multi-pet per user** — W MVP jeden konto = jeden pies. Userzy z dwoma psami w MVP wybierają jednego do profilu.
- **Time-window matching** ("zobacz kto ma overlap *teraz*, nie statycznie") — Odsunięte do v2 razem z resztą paradygmatu "tu i teraz". W MVP reguła operuje na statycznym obszarze.
- **Pełna WCAG-AA accessibility compliance** — MVP nie celuje w certyfikację a11y; osiąga się to, co naturalnie wynika ze zdrowych heurystyk (kontrast, semantyczny HTML), bez audytu.
- **Offline-first / praca bez sieci** — Apka zakłada online-only. Offline-first byłoby istotnym kosztem architektonicznym bez payoffu w v1.

## Open Questions

1. **Którzy providerzy OAuth lądują w v2** (gdy OAuth wraca po MVP)? — Owner: user. Block: no (post-MVP).
2. **Jak skalować matching rule przy 10k+ userów w mieście?** — Reguła "10% overlap mniejszego koła + sort po dystansie" przy ~100x obecnej skali generuje 50-200 matchy w gęstych okolicach (zalanie listy) i pozostawia cold-start na peryferiach. Wymaga przeglądu progu, paginacji, lub bardziej wieloczynnikowego rankingu. Owner: user. Block: no (post-MVP).
