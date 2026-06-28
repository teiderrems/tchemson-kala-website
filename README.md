# Site vitrine Tchemson-Kala

Application vitrine d'ecole avec FastAPI, PostgreSQL, Angular et Tailwind CSS v4.

## Demarrage local

1. Copier l'environnement:

```powershell
Copy-Item .env.example .env
```

Renseignez ensuite toutes les valeurs de `.env` (`POSTGRES_*`, `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, `CORS_ORIGINS`). Aucune valeur sensible n'est fournie par defaut dans le code.

2. Lancer PostgreSQL:

```powershell
docker compose up -d postgres
```

3. Installer et lancer l'API:

```powershell
poetry install
poetry run uvicorn app.main:app --reload
```

Poetry doit etre installe sur la machine. Si besoin:

```powershell
python -m pip install poetry
```

4. Installer et lancer le frontend Angular:

```powershell
cd frontend
npm install
npm run dev
```

Frontend dev: `http://localhost:4200`

API: `http://localhost:8000/api`

## Demarrage avec Docker

Construire et lancer l'application complete:

```powershell
docker compose up --build
```

L'application est disponible sur `http://localhost:8000`.

Nginx sert Angular et proxifie:

- `/api` vers FastAPI
- `/docs` vers la documentation FastAPI
- `/openapi.json` vers le schema OpenAPI

Les stages Node et Nginx utilisent des images Chainguard pour reduire les vulnerabilites signalees par les scanners.

Arreter les conteneurs:

```powershell
docker compose down
```

## Production

Construire Angular puis lancer FastAPI directement:

```powershell
cd frontend
npm run build
cd ..
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Le build Angular est servi depuis `dist`.

## Deploiement Render avec Docker

Render ne lance pas `docker-compose` pour un Web Service Docker. Le dernier stage du `Dockerfile` est donc autonome: il demarre FastAPI sur `127.0.0.1:8000` et Nginx sur le port fourni par Render via `PORT`.

Variables a definir dans Render:

- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SECRET`
- `ADMIN_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`

`CORS_ORIGINS` doit contenir l'URL publique Render de l'application, par exemple:

```text
https://votre-service.onrender.com
```

Il ne faut pas utiliser `api:8000` dans Render: ce nom existe uniquement dans `docker-compose`.

## Donnees

Au premier demarrage, FastAPI cree les tables et insere les sections par defaut. Les images par defaut sont stockees dans PostgreSQL dans la table `media_assets` en `bytea`.

L'espace admin est accessible via `/admin`. Les identifiants sont ceux definis dans `.env` avec `ADMIN_USERNAME` et `ADMIN_PASSWORD`.
`ADMIN_TOKEN_SECRET` doit etre une valeur longue et aleatoire, differente du mot de passe admin.

## Architecture

Backend FastAPI:

- `app/main.py`: creation de l'application, CORS, lifecycle et frontend fallback.
- `app/core/`: configuration applicative.
- `app/db/`: session SQLAlchemy et modeles.
- `app/api/router.py`: agregation des routeurs API.
- `app/api/routes/`: routes par domaine (`sections`, `media`, `messages`).
- `app/api/deps.py`: dependances partagees comme l'auth admin.
- `app/api/mappers.py`: conversion modeles SQLAlchemy vers schemas API.
- `app/services/`: logique applicative transversale comme le seed initial.

Frontend Angular:

- `frontend/src/app/core/`: services HTTP et types partages.
- `frontend/src/app/features/`: pages fonctionnelles (`home`, `admin`).
- `frontend/src/app/shared/`: composants reutilisables, notamment les sections de la vitrine.
