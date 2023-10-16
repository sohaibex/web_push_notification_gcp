### 1. **Configuration du projet**

#### **a. Configurez le SDK Google Cloud**

- Assurez-vous d'avoir installé le SDK `gcloud`. Sinon, [installez-le](https://cloud.google.com/sdk/docs/quickstarts).
- Authentifiez-vous avec Google Cloud:

  bashCopy code

  ```
  `gcloud auth login`
  ```

- Définissez votre projet:

  bashCopy code

  ```
  `gcloud config set project VOTRE_ID_DE_PROJET`
  ```

### 2. **Configuration des ressources GCP**

#### **a. Activez les APIs nécessaires**

- Activez les APIs Cloud Functions, Cloud Scheduler, Pub/Sub et Storage:

  bashCopy code

  ```
    gcloud services enable cloudfunctions.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable cloudscheduler.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable storage-component.googleapis.com
    gcloud services enable pubsub.googleapis.com
    gcloud services enable cloudresourcemanager.googleapis.com
  ```

#### **b. Créez un sujet Pub/Sub**

- Nous utiliserons Pub/Sub pour déclencher notre Cloud Function.

  bashCopy code

  ```
  gcloud pubsub topics create stationsApi
  ```

#### **c. Déployez la Cloud Function**

- Naviguez vers le répertoire contenant `index.js` et `cloudbuild.yml`.

  bashCopy code

  ```
  `gcloud builds submit --config cloudbuild.yml .`
  ```

#### **d. Configurez la tâche Cloud Scheduler**

- Ceci déclenchera la Cloud Function toutes les 10 minutes:

  bashCopy code

  ```
  `gcloud scheduler jobs create pubsub fetchDataEvery10Minutes --schedule "*/10 * * * *" --topic stationsApi --message-body "Récupérer les données et les sauvegarder sur GCS"`
  ```

 ## Justification de la fréquence de la tâche cron
- L'API que nous interrogeons fournit des informations en temps réel sur la disponibilité des vélos dans différentes stations. Les données en temps réel sont, par nature, sujettes à des changements fréquents. Cependant, "en temps réel" ne signifie pas nécessairement que les données changent chaque seconde ou chaque minute.

En choisissant une fréquence de 10 minutes pour notre tâche cron, nous essayons d'atteindre un équilibre entre plusieurs facteurs:

- Actualité des Données: Même si l'API fournit des données en temps réel, la fréquence à laquelle les vélos sont empruntés ou retournés à une station donnée ne sera probablement pas chaque minute. Une mise à jour toutes les 10 minutes devrait fournir un aperçu suffisamment actuel de la situation.

- Limitations de l'API: Bien que l'API ne mentionne pas explicitement de limites de débit, il est généralement judicieux de ne pas interroger l'API trop fréquemment pour éviter d'éventuelles restrictions ou pour ne pas surcharger le serveur.

- Coûts: Chaque invocation de la fonction cloud et chaque requête à l'API pourrait entraîner des coûts. En limitant les appels à une fois toutes les 10 minutes, nous maîtrisons ces coûts tout en obtenant des données relativement à jour.

- Performance et Ressources: L'interrogation fréquente d'une API et le traitement des données reçues peuvent consommer des ressources en termes de bande passante, de CPU et de mémoire. Une fréquence de 10 minutes offre un bon compromis entre l'actualité des données et l'utilisation efficace des ressources.

En somme, bien que l'API fournisse des données en temps réel, une fréquence de mise à jour toutes les 10 minutes est un choix judicieux qui équilibre l'actualité des informations, les coûts, les performances et les bonnes pratiques d'utilisation des APIs. 

### 3. **Configuration des permissions**

#### **a. Permissions pour que Cloud Scheduler publie sur Pub/Sub**

- Créez un compte de service pour Cloud Scheduler:

  bashCopy code

  ```
  `gcloud iam service-accounts create scheduler-pubsub-sa --display-name "Compte de service Scheduler Pub/Sub"`
  ```

- Accordez `roles/pubsub.publisher` au compte de service:

  bashCopy code

  ```
  `gcloud projects add-iam-policy-binding VOTRE_ID_DE_PROJET --member=serviceAccount:scheduler-pubsub-sa@VOTRE_ID_DE_PROJET.iam.gserviceaccount.com --role=roles/pubsub.publisher`
  ```

- Attribuez le compte de service à la tâche Cloud Scheduler:

  bashCopy code

  ```
  `gcloud scheduler jobs update pubsub fetchDataEvery10Minutes --service-account=scheduler-pubsub-sa@VOTRE_ID_DE_PROJET.iam.gserviceaccount.com`
  ```

#### **b. Permissions pour que Cloud Function écrive sur GCS et accède au Secret Manager**

Note: Vous avez commenté la partie Secret Manager dans votre code, mais j'ajoute les permissions au cas où vous souhaiteriez l'utiliser à l'avenir.

- Accordez `roles/storage.objectAdmin` et `roles/secretmanager.secretAccessor` au compte de service Cloud Function:

  bashCopy code

  ```
  `gcloud projects add-iam-policy-binding VOTRE_ID_DE_PROJET --member=serviceAccount:VOTRE_ID_DE_PROJET@appspot.gserviceaccount.com --role=roles/storage.objectAdmin
  gcloud projects add-iam-policy-binding VOTRE_ID_DE_PROJET --member=serviceAccount:VOTRE_ID_DE_PROJET@appspot.gserviceaccount.com --role=roles/secretmanager.secretAccessor`
  ```

### 4. **Coûts**

- **Cloud Functions**: Vous êtes facturé pour le temps de calcul et le nombre d'invocations. Les 2 premiers millions d'invocations par mois sont gratuits.
- **Cloud Storage**: Vous payez pour l'espace de stockage utilisé et le trafic sortant. Les 5 premiers Go de stockage sont gratuits chaque mois.
- **Cloud Scheduler**: Les trois premières tâches créées sont gratuites. Après cela, le coût est de 0,10 $ par tâche et par mois.
- **Pub/Sub**: Les 10 premiers Go de données envoyées et reçues sont gratuits.

### 5. **Permissions**

```
gcloud projects add-iam-policy-binding notification-app-402119 --member=serviceAccount:619466666856@cloudbuild.gserviceaccount.com --role=roles/cloudfunctions.admin

gcloud projects add-iam-policy-binding notification-app-402119  --member=serviceAccount:619466666856@cloudbuild.gserviceaccount.com --role=roles/cloudfunctions.admin

gcloud projects add-iam-policy-binding notification-app-402119 --member=serviceAccount:619466666856@cloudbuild.gserviceaccount.com --role=roles/iam.serviceAccountUser

gcloud projects add-iam-policy-binding notification-app-402119 --member=serviceAccount:619466666856@cloudbuild.gserviceaccount.com --role=roles/pubsub.admin

gcloud projects add-iam-policy-binding notification-app-402119 --member=serviceAccount:619466666856@cloudbuild.gserviceaccount.com --role=roles/secretmanager.secretAccessor
```