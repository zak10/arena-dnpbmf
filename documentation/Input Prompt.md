Arena MVP PRD

Created: Nov 4, 2024

----------

Related (not written yet): [GTM: Arena MVP](https://docs.google.com/document/d/1YSOkqZMeBMuhj_a8o0SDscuZ7UeBHH0uyIlS0ONxmV8/edit?tab=t.0)

# Summary

## Product vision

TBU

****

# Problem Scoping

Leaders at companies are often responsible for evaluating and selecting software vendors for their respective teams. However, this is not a primary responsibility for these leaders and they do not have effective tools to help them compare options and move faster through each process. They are forced to set up discovery calls and demos with multiple providers, which can take hours out of their schedule each week. Furthermore, they have to organize sales collateral, evaluation criteria, and notes in separate spreadsheets and documents to share with colleagues before making their selection.

Essentially, they have to run independent evaluation processes for each provider they are considering and therefore can only consider a few options because of how time-consuming the evaluation is.

\[ list out concise problem statements \]

## Goals & Success Metrics

Our goals for this MVP are to validate two main hypotheses:

1. A centralized evaluation process where buyers can receive information they request, compare across vendors, and dictate how they are sold to by Sales teams is valuable enough to use Arena for their buying process

2. A high intent lead is valuable enough to salespeople that they are willing to provide the information requested by a prospect before actually talking to them

****

GoalSuccess MetricLearn if prospective software buyers prefer using Arena to run their evaluation process compared to their standard process100% of MVP buyers (users) create requests and accept or reject all proposals receivedLearn if vendors will provide detailed proposal information in exchange for anonymized leads75%+ of vendors submit proposals using the Arena template

****

## Non-goals

Since this is a MVP, there are plenty of things that are not goals. If any of these occur, they could be positive signals but they are not our intention.

- Collecting revenue from sellers (or buyers)

- Convert buyers into customers of a particular vendor (or any vendor)

- Sign up sellers to be customers of Arena

- Sign up buyers to use Arena beyond this MVP

****

# Solution Design

## Approach

Since we will not have a comprehensive catalog of vendors or any vendor customers, we will need to be scrappy and creative. Therefore, for our MVP, we will operate in the same manner as a lead generation agency that has not been retained yet by a vendor.

We will recruit prospective software buyers (those responsible for deciding which software to select at their company) to participate in a pilot program. Those buyers will be the primary users of Arena. Any user who submits a request becomes a high-intent lead that we can dangle in front of interested salespeople. We will reach out to account executives or other individuals that we think would be interested in receiving this lead.

However, unlike a typical lead generation agency, we will not put them directly in touch with the lead, they will have to adhere to our ground rules and provide the information requested (“a proposal”) by the prospect so that we can deliver it back to them while maintaining their anonymity.

Therefore, our approach will be to build out the necessary request and post-request features to allow buyers to request proposals, evaluate options (both before and after receiving their proposal(s)), and select the vendor that they’d like to move forward with.

****

## Key Features

### General Platform

1. User authentication with email / magic link (and any additional methods such as Google OAuth)

2. Google Analytics event tracking or equivalent for product analytics

3. Anthropic API integration

4. Internal Arena team notifications

5. Application monitoring

6. \[Latency, uptime, other technical requirements probably not relevant but placeholder\]

### Request Creation

1. Describing request and / or uploading supporting documentation

2. Normalizing request into requirements

3. Matching requirements to request search results

4. Viewing and confirming vendors you want to explicitly receive proposals from

5. Reviewing and confirming request (including editing by going back to rewrite request)

6. Creating account and verifying email

### Vendor Detail

1. Viewing basic vendor details (name, description, website)

2. Viewing vendor “fit” (target customer type, request requirements met)

3. Viewing pricing information

4. Viewing implementation information

5. Viewing compliance and security information

6. Viewing demos and sales materials

7. Viewing “social proof” (composite score from software advice websites)

### Request / Proposal Review

1. Viewing submitted requests and request details

2. Viewing proposal status

3. Viewing proposal details

   1. Vendor “pitch” (why choose us)

   2. Pricing

      1. Pricing model

      2. Total cost

      3. Seats / licenses (if applicable)

      4. Contract length and details

   3. Requirements

   4. Compliance and security information

   5. Referrals

   6. Implementation information

   7. Demos and sales materials

      1. Viewing videos

      2. Viewing/downloading documents

      3. Visiting external website links

   8. Timeline of major system generated events (e.g. proposal submitted, accepted, rejected, feedback requested, etc.)

4. Viewing vendor comparison

   1. Your requirements

   2. Vendor info

   3. Demos

### Follow Ups and Sharing

1. Requesting additional vendor information / updated proposal

2. Sharing request / proposal

### Selection Process

1. Rejecting proposals

2. Accepting proposals

   1. Sharing email / identity with vendor

### Notifications

1. \[Internal\] New proposal submitted

2. \[Internal\] Proposal updated

### Vendors: Lead Notification

1. \[Internal\] Notifying us when new request has been created

2. \[Internal\] Notifying us when new request has been edited

3. \[Internal\] Notifying us when new request has been submitted

4. \[Internal\] Notifying us when existing request has been rejected

5. \[Internal\] Notifying us when existing request has had an update requested

6. \[Internal\] Notifying us when existing request has been accepted

7. \[Internal\] Notifying us when existing request has been closed / deleted

### Vendors: Proposal Upload

1. \[Internal\] Uploading proposal information received from vendors

2. \[Internal\] Editing proposal information

### Out of Scope

1. Buyer roles, permissions, team management, account management

2. Internal operations tools (we will view screens as users themselves and update data through Django Admin / terminal as needed)

3. Automatic vendor catalog data sourcing (catalog will be manually maintained)

4. Third-party integrations (outside of Anthropic)

5. All seller-related application features (login, auth, lead viewing, proposal submission, etc.)

## Key Flows

### Create Request

1. From website (either logged out marketing site or logged in web app), click “Create Request”

2. Enter requirements and upload documents (optional)

3. Confirm requirements

4. Add/edit vendors in cart AKA “arena” (optional)

5. Review and finalize request (to edit, navigate backwards and rewrite request details)

6. Submit request

7. \[Create user and associate user\]

****

### Edit Request (Post-submission)

1. From logged in web app, click “Edit Request”

2. Enter details about what requirements they would like to add or change

3. Submit to admin review

4. Edit requirements and upload documents

5. Review and finalize updates

6. Submit updates

****

### Delete Request

1. From logged in web app, click “Delete Request”

2. Confirm delete

3. Navigate back to logged in home

### Reject Proposal

1. From proposal detail, click “Reject Proposal”

2. Confirm reject

3. Navigate back to proposal detail with updated status

### Request Update

1. From proposal detail, click “Request Update”

2. Enter additional information requested

3. Submit update

### Accept Proposal

1. From proposal detail, click “Accept Proposal”

2. Confirm accept

3. Confirmation of acceptance and fill out reasons for accepting and / or rejecting this others

4. Navigate back to request detail/home with updated statuses for all proposals

### Share Request

1. From request details, click “Share”

2. Copy link to share externally

3. (New user) click link

4. \[    \]

### Schedule Call

1. From request details, click “Schedule”

2. \[    \]

### \[Internal\] Create / Update Proposal

1. Arena staff logs in to Admin and uploads proposal information to database

2. Notify buyer who who created the request that new proposal information is available

3. Buyer clicks link to that proposal

****

## Key Logic

### General Platform

No system logic required?

### Request Creation

#### Free-text to Requirements Translation

This includes taking free-text on “what are you looking for” and uploaded files (documents, spreadsheets, etc.) and interpreting them into structured requirements filters

1. User clicks “Next” after entering free-text and uploading documents, they cannot click “Next” without entering free-text

2. Persist free-text and documents to database

3. Make API call to Anthropic  Claude 3.5 Sonnet model with a set prompt that inserts user free-text and uploaded documents at assigned places

   1. Prompt: \________\_

      1. Version 1: You are a helpful assistant that takes the details of an RFP and returns the requirements the user has in key:value pairs. human: The RFP details are contained below between delimiters '#! RFP !#' #! RFP !# \<rfp details\> #! RFP !# You should respond with a JSON object container key:value pairs of the requirement names and their values and nothing else.

4. Receive API response from  Anthropic  Claude 3.5 Sonnet model in JSON format (as specified by initial prompt)

5. Parse JSON and persist requirements to database

6. Navigate to and surface results

****

#### Handling Vague Requirements

1. \[ Add details about empty states on the review page\]

   1. If there are no requirements, language about refining your request language to be more specific pops up

   2. If there are not explicit vendors mentioned, language about adding some that you definitely would like to consider

2. No need to worry about vendor types under this scenario because we only have limited vendor types

3. If we had lots of different vendor types, then just randomly sort popular software or just don’t have any suggestions

#### Requirement Categorization

For MVP, we will have the following requirements available for someone to specify in their request

- Price

  - $

  - $$

  - $$$

  - $$$$

- Seats / Licenses?

- Integrations: List of product integrations (FK)

- Compliance Certifications: List of compliance certifications (FK or enum)

- Implementation timeline? List of timeline choices (enum)

  - ASAP

  - Within 1 month

  - Within 3 months

  - Within 6 months

  - Within 1 year

- Features?

- Preferred Vendors: List of vendors (FK)

  - Results added to cart by default

- Excluded Vendors: List of vendors (FK)

  - Filter results out entirely

- ….

****

#### Vendor Result List

The vendor result list will be broken down into different filtered lists and each list will be sorted according to the following logic

- Preferred Vendors

  - **Filter**: “Preferred Vendors” filter (interpreted from request) includes them

  - **Sort**: A to Z alphabetical? Popularity score descending?

- Perfect Match

  - **Filter**: All true filters (e.g. Integration with Slack) are met. If some requirements are not true filters (e.g. Seats 125) they should be counted as meeting the requirement and if all other true filters are met, they should be listed as a “Perfect Match” AND category within the same category of the implied search

  - **Sort**: A to Z alphabetical? Popularity score descending?

- Partial Match

  - **Filter**: At least one true filter is met AND category within the same category of the implied search

  - **Sort**: First level sort should be the number of requirements met / total requirements. Second level sort if first level sort is equal, A to Z alphabetical? Popularity score descending?

- Full List

  - **Filter**: All vendors within the same category of the implied search

  - **Sort**: First level sort should be the number of requirements met / total requirements. Second level sort if first level sort is equal, A to Z alphabetical? Popularity score descending?

#### Cart Validation

You do not need to have at any explicit vendors in order to create a request

#### Email Input and Account Creation (Primary User)

Anyone creating a request needs to provide their real business email in order to finalize the request. Uand upon doing so, we should create an account on their behalf.

1. User enters email address from request finalization screen

2. We check to confirm it is a valid email address format

3. We check to confirm it is a business email address by verifying that the domain is not a personal email service provider

4. If invalid, throw error

5. If valid, create user, assign email address to user, associate user with request, ensure request is visible from their logged-in account

****

Update with how to display comparison table rows / properties and sorting logic

****

### Request / Proposal Review

#### Comparison Table Rendering

Update with how to display comparison table rows / properties and sorting logic

1. Your Requirements

   1. Row Sorting: Alphabetic sort on requirement name

   2. Column Sorting: left to right your explicit vendors in the same order they were listed in your request + additional vendors based on when they submitted their proposal for the first time

   3. Values:

   4. Display: (Show more / show less)

2. Vendor Information

   1. Row Sorting: Fixed in this order: \____\_

   2. Column Sorting: Same as your requirements

   3. Values: Possible character limits, trimming logic

   4. Display: (Show more / show less)

3. Demos

   1. T

****

#### Edit Request Validation

\[Add something about ensuring they enter text when submitting an edit request for admin review\]

****

### Vendor Detail

#### Calculating Arena Performance

### Follow Ups and Sharing

#### Request Additional Information Validation

Users should be able to request additional information from vendors that can result in an updated proposal

1. From proposal detail, request info

2. If info requested is null, throw error

****

#### Email Input and Account Creation (Shared User)

Update with how to manage access to users who did not create the request

### Selection Process

#### Accept Proposal Validation

Only one proposal can be accepted and only after it has been formally received from a vendor

1. From proposal detail, accept proposal

2. If any other proposal has been accepted, disallow or throw error

3. If proposal has not been received from vendor, disallow

4. After proposal is accepted, auto-reject all other proposals

5. Disallow proposal actions including reject proposal, accept proposal, request feedback

#### Reject Proposal Validation

All proposals that have not already been accepted can be rejected

1. From proposal detail, reject proposal

2. If reject reason is null, throw error

3. Disallow proposal actions including reject proposal, accept proposal, request feedback

   1. Sharing is still allowed

****

### Notifications

Update with any relevant logic for how notifications should work. Most notifications will go out manually and do not need logic at this stage but some may go out to buyers automatically and may need validation logic.

****

### Vendors: Lead Notification

No system logic, all manual

### \[Internal\] Vendors: Proposal Upload

#### Proposal completeness validation

1. Add or edit a proposal directly in the database

2. If \[    \] does not exist, throw error

****

## Data Strategy

### Data Model

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXe2xta05bs9frFChTd1xi8Sgi6Sh-oSeguHr9Q5fgfp2VOgsIrFFY-pza8Uy5mzspqR2cAhjFF64frf5pJl-qeq3uqdmG8SKN7xD4bf4Zm6patX4efkFLNL0mX9aEXrCB8YnRXzpg?key=Sj55VvQA-MFxE8En4NtItmuT)

### Data Sourcing and Pipeline

All data visible in the product, used to facilitate workflows, or relevant to provide to/from vendors should be contained in this section. Each will be categorized into the following buckets:

BucketDescriptionSourced from userUser enters this information in productSourced from vendorVendor provides this information to usManually sourcedWe source this information ourselvesManually createdWe create this information ourselvesAutomatically sourcedThe product sources this information for usAutomatically createdThe product creates this information for us

****

#### User data (also becomes lead data)

Users

PropertyData TypeDescriptionData SourceUser nameStringUser first and last nameAutomatically CreatedUser emailStringUser’s company email addressSourced from UserJob titleStringUser’s job titleManually SourcedCompany nameStringUser’s company name (derived from their email address)Manually SourcedAutomatically SourcedRequestsFK to Software RequestsA request created by this userAutomatically Created

#### Request data

Software Requests

PropertyData TypeDescriptionRequest nameStringName of the request that is system generated to formalize the request (e.g. 2024/11/30 software request for XYZ co.)Automatically CreatedRaw requirementsStringParagraph (or more) of human written problem, requirements, vendors in mind, etc. describing what they are looking for from their softwareSourced from UserSupporting documentsFiles uploaded as supporting evidence to support free-text description “raw requirements”Sourced from UserOpen requestBooleanY/N whether the user is open to receiving proposals from vendors not specifically requested in “Requested vendors”Sourced from UserRequirementsFK to Request RequirementsThe requirements derived from “Raw requirements” (e.g. 100 users, SOC II Type 2 audited, Integrates with Hubspot, etc.)Automatically CreatedRequested vendorsFK to Requested VendorsThe vendors that a user has indicated they would definitely like to receive proposals fromAutomatically CreatedSourced from UserUserFK to UsersThe user that submitted the requestAutomatically CreatedProposalsFK to ProposalsThe proposals that have been submitted to match this requestAutomatically Created

****

Requested Vendors

PropertyData TypeDescriptionAdded atDatetimeTimestamp of when the vendor was added to requested vendorsAutomatically CreatedRequestFK to RequestsThe base software request submitted by a userAutomatically CreatedVendorsFK to VendorsThe vendors that a user has indicated they would like to receive a proposal fromAutomatically Created

****

Request Requirements

PropertyData TypeDescriptionTBU

#### Vendor data

Vendors

PropertyData TypeDescriptionData SourceVendor nameStringColloquial name of the vendor (e.g. Domo, not Domo Inc.)Manually SourcedWebsiteStringURL of the vendor’s websiteManually SourcedLogoLink to image fileVendor’s logoManually SourcedCategorySee belowVendors can be categorized into many different categories (although many if not all will have 1 category at first)Manually CreatedDescriptionStringShort paragraph description of who the vendor is and what they doManually SourcedCustomer fitStringShort paragraph description of what type of customer this vendor is “best for”Manually CreatedPrice rangeEnumInteger - Integer (probably 2 fields min and max)Relative price of a vendor’s product compared to competitors on a 1-4 scale (e.g. $, $$, $$$, $$$$ similar to restaurants)ORRange of their standard pricing including an estimated min (e.g. $100 per seat) and max (e.g. $400 per seat)Manually CreatedCustomer satisfactionFloatDecimal value from 0 to 1 represented as either a % or 1-5 star value representing customer satisfaction on sites like G2, Capterra, Trust Radius, etc.Manually CreatedImplementation timelineStringEstimated amount of time it takes to integrate with a vendor (e.g. 1-2 weeks)Manually CreatedFeaturesIntegrationsFK to IntegrationsVendors can have supported integrations with many different productsManually SourcedCompliance CertificationsFK to Compliance CertificationsVendors can have many different types of compliance certificationsManually SourcedVendor MaterialsFK to Vendor MaterialsVendors can have demos, whitepapers, sales decks, case studies, etc. to help sell their productsManually Sourced

****

Integration Compatibilities

PropertyData TypeDescriptionIntegration nameStringColloquial name of the product integration (e.g. Slack). These names will likely be the same as names in  “Vendors” but this represents whether there is an existing product integrationManually SourcedIntegration descriptionStringShort paragraph description of how the product integration works for that vendorManually CreatedLogoLink to imageLogo of the integration product (e.g. Slack logo)Manually SourcedVendorFK to VendorsRelationship to VendorsAutomatically Created

****

Compliance Certifications

PropertyData TypeDescriptionCertification nameStringName of certification (e.g. SOC 2 Type II)Manually SourcedEvidenceStringURL of the supporting documentation (e.g. link to SOC II report)Manually SourcedVendorFK to VendorsRelationship to VendorsAutomatically Created

****

Vendor Materials

PropertyData TypeDescriptionMaterial nameStringName of the material/file (e.g. 2024 Domo Data Whitepaper)Manually SourcedMaterial typeEnumType of material, values include DemoCase StudySales DeckWhitepaperAPI DocumentsArticle / Blog PostWebinarDigital Sales Room?…Manually CreatedMaterial linkStringURL to the material/file which can be an Arena URL if document was uploaded or an external link if hosted elsewhereManually SourcedVendorFK to VendorsRelationship to VendorsAutomatically Created

****

Software Category

PropertyData TypeDescriptionCategory nameStringName of the software categoryManually CreatedVendorFK to VendorsRelationship to VendorsAutomatically Created

****

#### Proposal data

Proposals

PropertyData TypeDescriptionData SourceTitleStringTitle of proposal system-generated (e.g. 2024 Domo Proposal for XYZ Co.)Automatically CreatedStatusEnumStatus of the proposal in regards to the buyer’s evaluationPendingUnder ReviewAcceptedRejectedAutomatically CreatedSubmitter nameStringName of the account executive or employee at vendor who submitted proposalAutomatically CreatedSubmitter emailStringEmail of the account executive or employee at vendor who submitted proposalAutomatically CreatedTotal Monthly PriceFloatTotal price per month of the software being proposed in dollars (e.g. $5000.00)Sourced from VendorSummaryStringParagraph of text explaining who the company is and who they serve (essentially a vendor description written by the AE specifically for this prospect)Sourced from VendorWhy Choose UsStringParagraph (or more) of text explaining why the prospective buyer should choose them as vendorSourced from VendorMaterialsFK to Proposal MaterialsIncludes demos, sales decks, or any other supporting evidence to help explain their productSourced from VendorReferrals FK to ReferralsIncludes referrals / testimonial style information from existing clientsSourced from VendorImplementation DetailsFK to Implementation DetailsIncludes details on what implementation of their software would look like in a step by step formatSourced from VendorAdditional InfoStringParagraph of text acting as a catch-all that can allow AEs to say something that we aren’t explicitly asking for (helps us understand what we might want to provide in the future)Sourced from VendorVendorFK to VendorsAutomatically CreatedRequestFK to RequestsAutomatically Created

****

Referrals

PropertyData TypeDescriptionData SourceReference company nameStringCompany name of the vendor’s customerSourced from VendorReference customer nameStringFirst and last name of the vendor’s customer point of contact / championSourced from VendorReference customer job titleStringJob title of the vendor’s customer point of contact / championSourced from VendorReference quoteStringTestimonial style quote from the reference customerSourced from VendorVendorFK to VendorsAutomatically CreatedRequestFK to RequestsAutomatically Created

****

Implementation Details

PropertyData TypeDescriptionData SourceStep orderIntegerSort order for the implementation step descriptions so that implementation is described in sequential orderSourced from VendorStep descriptionStringSentence length description of the implementation stepSourced from VendorVendorFK to VendorsAutomatically CreatedRequestFK to RequestsAutomatically Created

****

#### Lead data

PropertyData TypeDescriptionData SourceUserFK to Users (through Request?)The user that submitted a software requestAutomatically CreatedLead descriptionStringDescription of the type of company that is requesting software that maintains anonymity (e.g. Mid-sized fintech company with 500 employees)Manually CreatedLead qualityAutomatically CreatedAdditional info requestFK to Additional Information RequestParagraph describing additional information they would like to receive from a vendorSourced from UserEngagement signalsFK to Engagement SignalsUser analytics that indicate interest in a proposal (e.g. Demo links clicked, session length viewing a proposal, proposal link copied / shared, etc.)Possibly sourced from a third-party tool like Google AnalyticsAutomatically CreatedVendorFK to VendorsThe vendor that the lead is intended for (either because the request specified that vendor or we separately determine they should be considered a lead for a vendor)Manually CreatedAutomatically CreatedRequestFK to RequestsThe request that was made that created a new lead for a vendorAutomatically Created

****

# Key Risks

RiskMitigationBuyers do not accept a proposalBuyers reject all proposalsWe cannot source all proposals buyers explicitly ask forProposals have inconsistent information (some have more info than others)Information we display about a vendor is inaccurate

****

# Open Issues and Key Decisions

IssueDecisionHow are we doing the AI parsing of requirements?We are going to send a prompt to Anthropic telling them to parse the requirements for usSee: Requirements ChatHow are we structuring requirements?We are not going to structure requirements automatically. We will receive requirements back from Anthropic and store them to respond to the user immediately.We may normalize and curate the requirements asynchronously before sending them to vendors either in the database or outside of the database.See: Requirements ChatHow are we matching requirements to vendor qualities?Our prompt to Anthropic will ask for which requirements match relevant vendors without explicitly building a model and algorithm for matching the requirements to vendor propertiesSee: Requirements ChatHow are we identifying included or excluded vendors from requests?We are going to send a prompt to Anthropic along with the vendors in our database telling them to identify what vendors the request wants to include or exclude explicitlySee: Requirements ChatHow are we allowing editing of requirements?There will be no editing requirements, users will be prompted to re-write their request if they want to edit or reach out to Arena team for assistanceAre we distinguishing between requirements (must have, filters) from supporting information (not a requirement just part of the request, e.g. Seats)? If so, how?No, right now even something “supporting” like # of seats will show up as a requirement for now (requirements are somewhat unstructured see above)How will we handle vendor integrations, will we have integrations related to vendors in our database?How will we handle software categories, will we have software categories?Yes we will have software categories. The category identified in a request will help us provide the proper context about vendors to Anthropic and ensure helpful requirements identification.We will not show the software category in the product right now.How will we authenticate users? How will we handle sharing and authenticating “secondary” users?

****

#### Proposal data

- Sourced from vendor

  - Total price / price per seat (or equivalent)

  - Contract length

  - Payment frequency

  - Auto-renewal

  - Vendor “pitch”

  - Referrals

  - Implementation details

  - Feature details?

  - Materials (demos, whitepapers, slide decks, press releases, etc.)

  - Anything else you’d like to share?

- Manually sourced

- Manually created

- Automatically sourced

- Automatically created

****