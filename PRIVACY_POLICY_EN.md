# Trofia Privacy Policy and Data Deletion Policy

**App:** Trofia (`com.hermegas.trofia`)  
**Controller:** Hermegas  
**Reference version:** Trofia 0.8.1 Beta  
**Text last updated:** August 9, 2026  
**Effective date:** upon publication  
**Privacy contact and external deletion requests:** nutritiontracker.beta@gmail.com  
**Public URL:** https://magnoclovis.github.io/nutrition-tracker/privacy/

## 1. Scope and controller

This policy explains how Trofia collects, uses, stores, shares, and deletes personal data. Trofia is a beta nutrition-tracking application for recording meals, goals, water intake, supplements, body metrics, and related information.

The data controller is **Hermegas**. This policy considers the rights and principles of the European Union General Data Protection Regulation (**GDPR**) and Brazil's General Personal Data Protection Law (**LGPD**), as applicable to the user and the processing performed.

## 2. Data processed

Trofia may process:

- account data: email address, Firebase identifier, display name, verification state, and access dates;
- profile data: birth date, gender, height, language, activity level, and preferences;
- nutrition data: meals, times, foods, nutrients, pantry, meal templates, notes, water, supplements, and goals;
- body metrics: weight, calculated BMI, body-fat percentage, waist measurement, muscle mass, and history;
- training or rest-day information and goal history;
- prompts, meal photos voluntarily submitted to artificial-intelligence features, nutrition context needed for the request, and generated responses;
- barcodes queried through the scanner;
- content and attachments voluntarily submitted through the feedback form;
- settings, caches, and session state stored on the device;
- technical metadata necessary for authentication, security, and AI rate limiting.

Passwords are processed by Firebase Authentication and are not available to Hermegas.

## 3. Purposes

Data is used to:

- create, authenticate, and maintain accounts;
- synchronize information across sessions and devices;
- record and display the nutrition diary;
- calculate goals, totals, charts, and history;
- generate AI suggestions and estimates, including identifying foods and estimating nutrients from meal photos, when requested;
- retrieve product information by barcode;
- export, import, and restore backups;
- enforce usage limits and protect the service;
- respond to feedback, privacy requests, and incidents;
- comply with legal obligations and maintain security.

## 4. Legal bases

Under the GDPR, LGPD, and other applicable rules, processing may rely on:

- performance of the service requested by the user;
- consent, where required for optional features;
- legitimate interests in security, stability, and abuse prevention, after considering the user's rights;
- compliance with legal or regulatory obligations;
- the establishment or exercise of rights and the handling of data-subject requests.

Where processing relies on consent, consent may be withdrawn at any time without affecting processing lawfully performed before withdrawal.

## 5. Artificial intelligence

When a user starts an AI feature, Trofia sends the prompt and necessary nutrition context to a Cloudflare Worker. For image-based meal recognition, the content also includes the photo captured or selected by the user. The Worker validates the Firebase session, enforces usage limits, and forwards the content to Google's Gemini API.

The Worker application code does not store prompts, photos, or responses in a database, and observability is disabled. For rate limiting, the Durable Object holds technical records containing the Firebase identifier and recent timestamps, as well as aggregate daily counters. These records do not contain prompt text, photos, or responses. The technical policy set for publication limits individualized metadata to a maximum of 24 hours.

During beta testing, Trofia may use the unpaid Gemini API quota. Under Google's terms, for unpaid use outside the European Economic Area, Switzerland, and the United Kingdom, inputs, submitted files — including images — and responses may be used to provide, improve, and develop Google products and may be processed by human reviewers. Google's terms apply different conditions to paid services and to users in the European Economic Area, Switzerland, and the United Kingdom. As an additional privacy decision, Trofia requires active billing on the Gemini project before image-based meal recognition is made available to any real tester in those regions; for paid services, Google states that it does not use prompts, files, or responses to improve its products, although it may retain limited logs for safety, abuse prevention, and legal obligations.

AI responses may be inaccurate and do not replace professional medical or nutrition advice. Users should not include diagnoses, medical records, prescriptions, or unnecessary confidential information in AI prompts.

## 6. Barcode scanning, camera, and meal photos

For barcode scanning, the camera is accessed only when the user starts the scanner. Video frames are processed locally to identify the barcode and are not stored or uploaded by Trofia.

The detected code may be sent to Open Food Facts to retrieve public product information. Accuracy and availability depend on that external database.

For image-based meal recognition, the user expressly chooses to take a photo or select an image from the gallery. Before upload, the application corrects orientation, resizes the image to a maximum of 1,280 pixels, converts it to JPEG at approximately 80% quality, and re-encodes it to remove embedded metadata. The processed version is sent over HTTPS through Trofia's authenticated Worker to the Gemini API, which identifies foods and estimates quantities and nutrients.

The photo is not saved to the Trofia account, diary, or backups, and the Worker does not persist or log it. The application discards its preview and temporary copy after the flow. The operating system, browser, or native plugin may temporarily retain capture files under their own rules, and an original selected from the gallery remains under the user's control. If the user reviews and accepts the result, only the derived and edited nutrition data is saved to the diary. This feature is optional; other meal-registration methods remain available without submitting a photo.

## 7. Feedback

When the user selects “Send feedback,” Trofia opens a Google Forms page. The form may receive text, contact details, and images the user chooses to provide.

This information is subject to Google's policies. Hermegas intends to retain responses for up to **12 months**, unless a legitimate need requires a longer period, and may delete them earlier following a valid user request.

## 8. Providers and external services

Trofia uses:

- Firebase Authentication for authentication;
- Cloud Firestore to process and store account data in the `europe-southwest1` region (Madrid, Spain, European Union);
- Cloudflare Workers and Durable Objects to relay and rate-limit AI calls;
- Gemini API to process AI features, including meal photos voluntarily submitted by users;
- GitHub Pages to provide the web application and public policy;
- Open Food Facts for product queries;
- Google Forms when feedback is submitted;
- Google Play for Android distribution and Google's own installation, security, and diagnostic processing.

Cloud Firestore processes and stores account data in the `europe-southwest1` region, in Madrid, Spain, within the European Union. Outside Cloud Firestore, Firebase Authentication is operated from data centers in the United States, and global services such as Gemini API, Cloudflare Workers, GitHub Pages, Google Forms, and Google Play may process information outside the European Union according to the nature of their services, their terms, policies, and lawful international-transfer mechanisms. The specific conditions described in Section 5 also apply to the Gemini API.

Trofia does not currently integrate Firebase Analytics or Firebase Crashlytics. Installation or diagnostic data processed directly by Google Play follows Google's policies and does not necessarily mean that Hermegas receives individualized data.

## 9. Sharing

Trofia does not sell personal data or use it for behavioral advertising.

Data is shared only when necessary to provide requested functionality, operate infrastructure, protect the service, handle user requests, or comply with legal obligations.

## 10. Retention

Account data remains in Firebase while the account exists or until it is deleted.

Local session state and certain caches remain on the device until replaced, deleted by the application or operating system, or removed by clearing app data or uninstalling the app.

Prompts, meal photos, and responses are not stored by the Worker application code. The application holds a photo only during the flow needed to process and review the result and then discards it, except for temporary caches controlled by the operating system, browser, or native plugin. Retention by Gemini and other providers is governed by their terms, including limited periods applicable to safety, abuse prevention, and legal obligations. Individualized metadata used to rate-limit AI calls must be kept for no longer than 24 hours; aggregate global counters may be kept for the relevant quota day and for the technical period needed to replace them.

Feedback-form responses are retained for up to 12 months unless legal compliance, security, incident investigation, or a valid early-deletion request requires otherwise.

Exported backups remain under the user's control. Trofia cannot delete files already downloaded, copied, or shared by the user.

Following a valid deletion request, Hermegas does not intend to deliberately retain data associated with the account except where retention is necessary to comply with law, exercise rights, prevent fraud, or protect security. Providers may retain transient copies or records according to their own legal and technical periods.

## 11. Backup and export

Users can export data as JSON and other available formats. These files may contain personal and nutrition information and should be stored securely.

Imports may append or replace selected categories according to the option shown in the application.

Meal photos are not included in backups. When a user accepts an image analysis, a backup may contain only the derived nutrition entries that were reviewed and saved to the diary.

## 12. Account and data deletion

Inside the application, the path is:

**Settings → Privacy & security → Delete account.**

The user must re-enter the account password and confirm the operation. The flow first requests deletion of associated Firestore documents and then deletion of the Firebase Authentication account.

If a detectable step fails, the application displays an error and deletion may have been partial. The user should then contact **nutritiontracker.beta@gmail.com**.

Deletion can also be requested without access to the application by emailing **nutritiontracker.beta@gmail.com** from the account address or by providing enough information to verify identity. The request will be answered and handled within **30 days**, unless applicable law requires a different period.

Downloaded backup files and other user-held copies are not deleted. Residual local data may require clearing app data or uninstalling the application. Providers may retain transient copies or security and legally required records according to their policies.

## 13. User rights

As applicable under the GDPR, LGPD, or other law, users may request access, confirmation of processing, correction, export, portability, deletion, anonymization, restriction, or objection, as well as information about sharing and legal bases.

Users may also withdraw consent where consent is the applicable basis and lodge a complaint with the competent data-protection authority.

Requests should be sent to **nutritiontracker.beta@gmail.com** and will be answered within 30 days unless a different statutory period applies.

## 14. Security

Trofia uses Firebase authentication, session tokens, access rules, and HTTPS connections. The AI proxy requires authentication and applies per-user and global limits.

No system is completely risk-free. Users should protect their passwords and backup files.

## 15. Children and minors

Trofia is not intended for children under **16 years of age**. People aged 16 or 17 must use the service in accordance with applicable law and, where required, with authorization and supervision from a legal guardian.

## 16. Nutrition limitations

Trofia provides calculations and estimates for informational purposes. Results may vary due to portions, brands, food preparation, entered information, external databases, and AI limitations.

The application does not provide diagnosis, treatment, or clinical monitoring and does not replace healthcare professionals.

## 17. Changes

This policy may be updated following changes to the product, providers, or applicable law. Material changes will be communicated through the application, the public page, or another appropriate channel.
