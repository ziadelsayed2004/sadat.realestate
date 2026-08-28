# Execution Order

## Active delivery waves

The historical dependency order below remains useful for atomic task selection, but the current screen-delivery order is governed by `PARALLEL_WAVE_PLAN.json` and the prompts in `05_prompts/`.

1. **Coordinator Bootstrap:** complete and verify email-only Seeker/Provider authentication, the Hostinger SMTP contract, safe `mapUrl` persistence/projection, shared quality drift, and the explicit legacy OTP migration. Shared changes are Coordinator-owned.
2. **Wave 1 (parallel):** Public (`PUB-01`–`PUB-12`), Auth (`AUTH-01`–`AUTH-17` plus aliases), and Seeker (`SEK-01`–`SEK-10`) work on separate roots and write only lane-owned UI, tests, and evidence.
3. **Wave 2:** Provider (`PRV-01`–`PRV-24`) runs after Wave 1 reconciliation. The supplementary phone-verification export is reconciled as historical Auth evidence and is not counted as a screen.
4. **Wave 3 (solo):** Admin (`ADM-01`–`ADM-66`) runs only after Provider closes. `ADM-18` and `ADM-54` retain explicit source provenance; no Figma node may be invented.

No screen is closed from a source-only or screenshot-only result. Every closure requires deterministic before/after evidence, visual and interaction review, accessibility checks, and either `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`.

This canonical order is connected by dependencies and enforces backend-first, one-task-at-a-time execution.

## B0_discovery_foundation

1. `backend_000` — Inventory Repository Truth and Lock Decisions
2. `backend_001` — Initialize the Monorepo and Workspaces
3. `backend_002` — Bootstrap Express and TypeScript
4. `backend_003` — Manage Environments and Secrets
5. `backend_004` — MongoDB Connectivity, Health, and Seed
6. `backend_005` — Shared Contracts and Error Envelope
7. `backend_006` — API Security Baseline
8. `backend_007` — Logging and Request Context
9. `backend_008` — Testing, CI, and Quality Foundation
10. `backend_009` — OpenAPI and Postman Foundation
## B1_identity_access

11. `backend_010` — Identity and Account Models
12. `backend_011` — Login, Sessions, Refresh, and Logout
13. `backend_012` — OTP and Email Verification (legacy task key)
14. `backend_013` — Seeker Registration, Profile, and Preferences
15. `backend_014` — Provider Types and Registration Application
16. `backend_015` — Private Provider Documents
17. `backend_016` — Admin Login and Administrator Accounts
18. `backend_017` — Roles and Permissions Engine
19. `backend_018` — Ownership, Scopes, and Available Actions
20. `backend_019` — Account States and Restrictions
21. `backend_020` — Sensitive-Action Audit Log
## B2_master_data_localization

22. `backend_030` — Multilingual Content Primitives
23. `backend_031` — Locations and Neighborhoods
24. `backend_032` — Property Categories and Types
25. `backend_033` — Features and Services
26. `backend_034` — Developers, Companies, and Source Identity
27. `backend_035` — Platform, Contact, and Social Data
28. `backend_036` — About Content and Team
29. `backend_037` — Population Counter and Real-Estate Tips
30. `backend_038` — Homepage and Display Management
31. `backend_039` — SEO and Public Privacy
## B3_projects_properties

32. `backend_040` — Project Model and Provider CRUD
33. `backend_041` — Project Review Workflow
34. `backend_042` — Public Project Projection
35. `backend_043` — Property Model and Source Identity
36. `backend_044` — Property Draft, Core Data, and Location
37. `backend_045` — Property Details, Pricing, and Payment Plans
38. `backend_046` — Property Features, Services, and Contact
39. `backend_047` — Property Media Processing
40. `backend_048` — Property Validation and Review Submission
41. `backend_049` — Property Review and Publication
42. `backend_050` — Property Revisions and Change History
43. `backend_051` — Provider Property Management
44. `backend_052` — Admin Property Management
45. `backend_053` — Potential Duplicate Detection
46. `backend_054` — Property Reports
47. `backend_055` — Property Indexes and Queries
## B4_public_seeker

48. `backend_060` — Homepage Read Model
49. `backend_061` — Public Property Listing, Search, and Filters
50. `backend_062` — Public Property Details
51. `backend_063` — Two-Unit Comparison
52. `backend_064` — Developer and Company Directory
53. `backend_065` — Saved Properties
54. `backend_066` — Seeker Overview
55. `backend_067` — Search Preferences and Account
56. `backend_068` — Seeker Notification Center
57. `backend_069` — Public Data Masking and Projection
## B5_requests_crm

58. `backend_070` — Unified Request Model and States
59. `backend_071` — Contact Requests
60. `backend_072` — Viewing Requests and Appointments
61. `backend_073` — Property Search Requests
62. `backend_074` — Provider-Added Customer Requests
63. `backend_075` — Seeker Requests and Details
64. `backend_076` — Provider Request CRM
65. `backend_077` — Admin Request Operations
66. `backend_078` — SLA and Overdue Requests
67. `backend_079` — Request Reports and Issues
68. `backend_080` — Assignment, Internal Notes, and Projection
69. `backend_081` — Request Lifecycle Events and Notifications
## B6_content_community

70. `backend_090` — Article Categories
71. `backend_091` — Article Management
72. `backend_092` — Public Article Listing and Details
73. `backend_093` — Community Posts
74. `backend_094` — Community Comments
75. `backend_095` — Community Reporting and Moderation
76. `backend_096` — Public Community Projection
77. `backend_097` — Content and Localization Audit
## B7_ads_payments

78. `backend_100` — Ad Placements and Settings
79. `backend_101` — Advertising Requests
80. `backend_102` — Manual Pricing and Quotes
81. `backend_103` — Private Payment-Proof Upload
82. `backend_104` — Payment-Proof Review
83. `backend_105` — Ad Scheduling and Calendar
84. `backend_106` — Advertising Banners
85. `backend_107` — Provider Advertising Request Projection
86. `backend_108` — Financial Review and Advertising Ledger
## B8_commissions

87. `backend_110` — Commission Policies
88. `backend_111` — Account Commission
89. `backend_112` — Commission Exceptions
90. `backend_113` — Commission Policy Resolver and Snapshot
91. `backend_114` — Commission Policy Confirmations
92. `backend_115` — Commission Change Log
93. `backend_116` — Provider Commission Projection
94. `backend_117` — Commission and Temporal-State Tests
## B9_admin_system_readiness

95. `backend_120` — Admin Overview Statistics
96. `backend_121` — Administrator Account APIs
97. `backend_122` — Admin Notification Center
98. `backend_123` — Unified Admin Settings API
99. `backend_124` — File and Asset Governance
100. `backend_125` — Outbox and Scheduling Worker
101. `backend_126` — Runtime Route and API Contract Inventory
102. `backend_127` — Journey-Based Postman Collections
103. `backend_128` — UAT Seed Data and Fixtures
104. `backend_129` — Negative Authorization Test Matrix
105. `backend_130` — Upload and Media Security Verification
106. `backend_131` — Search and Performance Tests
107. `backend_132` — Migrations, Backup, and Restore
108. `backend_133` — Native Services and Production Runtime
109. `backend_134` — Health, Readiness, and Monitoring
110. `backend_135` — Security Assurance Report
111. `backend_136` — Backend End-to-End Journeys
112. `backend_137` — Contract Freeze and Frontend Handoff
113. `backend_138` — Backend Readiness Gate
## F0_frontend_foundation

114. `frontend_000` — Establish Vite SSR and Frontend Architecture
115. `frontend_001` — Extract Design Tokens and Assets
116. `frontend_002` — Core Component Library
117. `frontend_003` — Shells, Routes, and Error Boundaries
118. `frontend_004` — API Client and Data Contracts
119. `frontend_005` — Authentication State, Guards, and Permissions
120. `frontend_006` — Localization and RTL/LTR
121. `frontend_007` — Loading, Empty, Error, and Success States
122. `frontend_008` — Accessibility and Responsive Baseline
123. `frontend_009` — Frontend Tests and Visual Harness
## F1_public_site

124. `frontend_010` — Public Homepage
125. `frontend_011` — Property Listing and Search
126. `frontend_012` — Property Details
127. `frontend_013` — Unit Comparison
128. `frontend_014` — Developers, Companies, and Developer Profiles
129. `frontend_015` — Article Listing and Details
130. `frontend_016` — Community and Post Creation
131. `frontend_017` — About Platform and Team
132. `frontend_018` — SEO and SSR for Public Routes
133. `frontend_019` — Responsive QA for the Public Site
## F2_auth_onboarding

134. `frontend_020` — Login and OTP
135. `frontend_021` — Seeker Registration and Account Success
136. `frontend_022` — Provider Type Selection
137. `frontend_023` — Provider Account Details
138. `frontend_024` — Business, Company, and Document Details
139. `frontend_025` — Provider Review and Application Tracking
140. `frontend_026` — Responsive Registration QA
## F3_seeker_dashboard

141. `frontend_030` — Seeker Shell and Overview
142. `frontend_031` — Seeker Requests and Details
143. `frontend_032` — Viewing Requests
144. `frontend_033` — Saved Properties
145. `frontend_034` — Seeker Notifications
146. `frontend_035` — Profile, Preferences, and Settings
147. `frontend_036` — Seeker Dashboard QA
## F4_provider_dashboard

148. `frontend_040` — Provider Shell and Overview
149. `frontend_041` — My Properties
150. `frontend_042` — Add Property: Core Data and Location
151. `frontend_043` — Add Property: Details, Price, and Features
152. `frontend_044` — Add Property: Media, Contact, and Review
153. `frontend_045` — Submission Errors and Property States
154. `frontend_046` — Projects
155. `frontend_047` — Customer Requests and Request Creation
156. `frontend_048` — Viewing Appointments
157. `frontend_049` — Advertising Requests and Commission
158. `frontend_050` — Notifications and Settings
159. `frontend_051` — Provider Dashboard QA
## F5_admin_dashboard

160. `frontend_060` — Admin Shell and Overview
161. `frontend_061` — Users, Seekers, Providers, and Verification
162. `frontend_062` — Reports and Account Restrictions
163. `frontend_063` — Categories, Locations, and Features
164. `frontend_064` — Project Management and Review
165. `frontend_065` — Property Management, Review, Duplicates, and Reports
166. `frontend_066` — All Request-Type Administration
167. `frontend_067` — Article and Category Management
168. `frontend_068` — Community, Comment, and Report Administration
169. `frontend_069` — About, Team, and Population Counter
170. `frontend_070` — Ads, Payments, Calendar, and Financial Review
171. `frontend_071` — Commission Policies, Exceptions, and Confirmations
172. `frontend_072` — Banners, Tips, and Homepage
173. `frontend_073` — Platform, Contact, and Social Data
174. `frontend_074` — Property, Request, Ad, SEO, Privacy, and Display Settings
175. `frontend_075` — Administrator Users, Roles, and Permissions
176. `frontend_076` — Admin Notifications and Audit Log
177. `frontend_077` — Admin Dashboard and Permission QA
## F6_integration_release

178. `frontend_080` — Critical End-to-End Journeys
179. `frontend_081` — Visual Fidelity Review
180. `frontend_082` — Three-Locale and Direction QA
181. `frontend_083` — Accessibility Audit
182. `frontend_084` — Performance and Core Web Vitals
183. `frontend_085` — Browser and Session Security
184. `frontend_086` — UAT, Postman, and Screen-State Data Binding
185. `frontend_087` — Secure Preview Build and Deployment
186. `frontend_088` — Operations and Handoff Guide
187. `frontend_089` — UAT and Defect Closure
188. `frontend_090` — Final Release Gate

## Current expanded post-release sequence (source: TASK_CATALOG.json)

189. `frontend_080` - Critical End-to-End Journeys
190. `frontend_081` - Visual Fidelity Review
191. `frontend_082` - Three-Locale and Direction QA
192. `frontend_083` - Accessibility Audit
193. `frontend_084` - Performance and Core Web Vitals
194. `frontend_085` - Browser and Session Security
195. `frontend_086` - UAT, Postman, and Screen-State Data Binding
196. `frontend_087` - Secure Preview Build and Deployment
197. `frontend_088` - Operations and Handoff Guide
198. `frontend_089` - UAT and Defect Closure
199. `frontend_090` - Final Release Gate
200. `frontend_091` - Restore and Verify the Approved Design Source Bundle
201. `frontend_092` - Public and Authentication Design Parity Remediation
202. `frontend_093` - Seeker Dashboard Design Parity Remediation
203. `frontend_094` - Provider Dashboard Design Parity Remediation
204. `frontend_095` - Admin Dashboard Design Parity Remediation
205. `frontend_096` - Author and Verify ADM-54 Request Settings Design
206. `frontend_097` - Full Success-State Browser and Defect-Closure Matrix
207. `frontend_098` - Final Production-Parity Platform Gate
208. `frontend_099` - Public Exact Figma Parity Closure - PUB-01 through PUB-08
209. `frontend_100` - Concurrent Owner-Clone Parity Coordinator - Public, Authentication, and Seeker

Current coordinator state: `frontend_100` is complete after the final Wave 1 visual reconciliation recorded in `08_reality_sync/WAVE_1_FINAL_VISUAL_CLOSURE_2026-08-29.json`. The visual queue is dependency-ready at `PRV-01`; Provider and Admin implementation remain unopened until their own goals begin.
