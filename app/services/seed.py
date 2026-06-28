from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MediaAsset, PageSection


def _svg_bytes(label: str, fill: str = "#f9f9fc") -> bytes:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
  <rect width="1400" height="900" fill="{fill}"/>
  <circle cx="1080" cy="180" r="260" fill="#7efc98" opacity=".45"/>
  <circle cx="260" cy="760" r="280" fill="#fee339" opacity=".42"/>
  <circle cx="1160" cy="680" r="180" fill="#2fbcff" opacity=".22"/>
  <rect x="150" y="180" width="1100" height="540" rx="48" fill="#ffffff" opacity=".78"/>
  <text x="700" y="430" text-anchor="middle" font-family="Plus Jakarta Sans, Arial" font-size="72" font-weight="800" fill="#006b2e">{label}</text>
  <text x="700" y="510" text-anchor="middle" font-family="Source Sans 3, Arial" font-size="30" fill="#3e4a3e">Centre Educatif Bilingue Tchemson-Kala</text>
</svg>"""
    return svg.encode("utf-8")


DEFAULT_MEDIA = [
    ("hero.svg", "image/svg+xml", "Eleves dans un environnement scolaire lumineux", "Bienvenue", "#f9f9fc"),
    ("vision.svg", "image/svg+xml", "Bibliotheque et apprentissage bilingue", "Vision", "#f3f3f6"),
    ("services.svg", "image/svg+xml", "Equipe pedagogique et services scolaires", "Services", "#eeeef0"),
    ("life.svg", "image/svg+xml", "Vie scolaire et communaute", "Vie scolaire", "#e8e8ea"),
    ("events.svg", "image/svg+xml", "Evenements scolaires et calendrier", "Evenements", "#f7fff3"),
    ("contact.svg", "image/svg+xml", "Carte et localisation de l'ecole", "Contact", "#ffffff"),
    ("app-background.svg", "image/svg+xml", "Arriere-plan global de l'application", "Tchemson-Kala", "#f9f9fc"),
]


DEFAULT_SECTIONS = [
    {
        "key": "site-settings",
        "title_fr": "Parametres du site",
        "title_en": "Site settings",
        "subtitle_fr": "Configuration globale invisible sur la vitrine.",
        "subtitle_en": "Global configuration hidden from the showcase page.",
        "kind": "settings",
        "sort_order": 0,
        "media_index": 6,
        "content": {
            "appBackgroundImageUrl": "",
            "appBackgroundPosition": "center",
            "appBackgroundOverlay": "rgba(249, 249, 252, 0.46)",
        },
    },
    {
        "key": "hero",
        "title_fr": "Confiez-nous vos enfants, ensemble nous oeuvrons.",
        "title_en": "Trust us with your children; together we work.",
        "subtitle_fr": "Une ecole maternelle et primaire bilingue qui forme des leaders futuristes equilibres.",
        "subtitle_en": "A bilingual nursery and primary school shaping balanced future leaders.",
        "kind": "hero",
        "sort_order": 10,
        "media_index": 0,
        "content": {
            "academicYearStartMonth": 9,
            "primaryAction": "S'inscrire / Enroll Now",
            "secondaryAction": "Telecharger le prospectus / Download Prospectus",
            "stats": [
                {"value": "500+", "label": "Futurs leaders accompagnes / Future leaders supported"},
                {"value": "FR/EN", "label": "Immersion bilingue / Bilingual immersion"},
                {"value": "100%", "label": "Environnement securise / Safe environment"},
            ],
        },
    },
    {
        "key": "vision",
        "title_fr": "Notre vision et nos atouts",
        "title_en": "Our vision and strengths",
        "subtitle_fr": "Une education integrale de nos petits des le bas age pour des leaders futuristes equilibres.",
        "subtitle_en": "A holistic education from early childhood for balanced future leaders.",
        "kind": "cards",
        "sort_order": 20,
        "media_index": 1,
        "content": {
            "items": [
                {"icon": "translate", "title": "Bilingue / Bilingual", "text": "Maitrise progressive du francais et de l'anglais. / Progressive mastery of French and English."},
                {"icon": "groups", "title": "Engagement / Engagement", "text": "Personnel et parents dynamiques autour de chaque enfant. / Staff and parents actively support every child."},
                {"icon": "library_books", "title": "Bibliotheque / Library", "text": "Espaces modernes pour lire, chercher et creer. / Modern spaces to read, explore and create."},
                {"icon": "computer", "title": "Salle multimedia / Multimedia room", "text": "Eveil technologique dans un cadre encadre. / Guided technology discovery in a structured environment."},
            ]
        },
    },
    {
        "key": "admissions",
        "title_fr": "Modalites d'inscription",
        "title_en": "Registration details",
        "subtitle_fr": "Les inscriptions ouvrent le 02 juillet 2025.",
        "subtitle_en": "Admissions open on July 2, 2025.",
        "kind": "admissions",
        "sort_order": 30,
        "media_index": 0,
        "content": {
            "registrationFee": "5,000 FCFA",
            "requirements": [
                "Formulaire dument rempli / Completed registration form",
                "Copie d'acte de naissance / Birth certificate copy",
                "Carnet de vaccination / Vaccination card",
                "4 photos d'identite / 4 passport photos",
                "Rame de papier / Paper ream",
            ],
            "payments": [
                {"label": "1er versement / First installment", "amount": "30,000 FCFA", "deadline": "01 Octobre 2025 / October 1, 2025"},
                {"label": "2e versement / Second installment", "amount": "30,000 / 20,000 FCFA", "deadline": "01 Novembre 2025 / November 1, 2025"},
                {"label": "3e versement / Third installment", "amount": "15,000 FCFA", "deadline": "01 Decembre 2025 / December 1, 2025"},
            ],
            "promotions": [
                "Uniforme offert pour les nouveaux eleves avant le 1er septembre. / Free uniform for new students before September 1.",
                "Reduction de 5,000 FCFA par enfant en cas de paiement complet anticipe. / 5,000 FCFA discount per child for early full payment.",
            ],
        },
    },
    {
        "key": "services",
        "title_fr": "Services et equipe",
        "title_en": "Services and team",
        "subtitle_fr": "Expertise pedagogique, accompagnement bienveillant et services essentiels pour que chaque eleve progresse dans un cadre serein.",
        "subtitle_en": "High-standard educational expertise, nurturing support services and bilingual teaching staff to help every student thrive.",
        "kind": "services",
        "sort_order": 40,
        "media_index": 2,
        "content": {
            "badge": "Excellence Bilingue / Bilingual Excellence",
            "highlights": [
                {"icon": "verified", "title": "100% certifie / 100% certified", "text": "Equipe qualifiee, encadrement rigoureux et approche bilingue. / Qualified team, rigorous support and bilingual approach."},
                {"icon": "groups", "title": "Suivi humain / Human support", "text": "Un lien constant entre administration, enseignants et familles. / A steady link between administration, teachers and families."},
                {"icon": "health_and_safety", "title": "Cadre securise / Safe setting", "text": "Sante, repas, transport et routines scolaires suivis. / Health, meals, transport and school routines are monitored."},
            ],
            "team": [
                {
                    "icon": "school",
                    "name": "Mme Clarisse M.",
                    "role": "Directrice academique / Headmistress",
                    "bio": "Specialiste du curriculum bilingue avec plus de 15 ans d'experience dans l'education internationale. / Bilingual curriculum specialist with over 15 years of international education experience.",
                    "skills": ["M.Ed. Bilinguisme / M.Ed. Bilingual Education", "Formation pedagogique / Teacher training"],
                },
                {
                    "icon": "science",
                    "name": "Mr David T.",
                    "role": "Responsable sciences / Science Lead",
                    "bio": "Passionne par les sciences et les projets STEM, il facilite la comprehension en francais et en anglais. / Passionate about science and STEM projects, he supports understanding in French and English.",
                    "skills": ["STEM", "Dual-Lang Certified"],
                },
                {
                    "icon": "menu_book",
                    "name": "Mme Sarah E.",
                    "role": "Specialiste langues / Language Specialist",
                    "bio": "Accompagne les premiers apprentissages en lecture, phonique et expression orale bilingue. / Supports early reading, phonics and bilingual speaking skills.",
                    "skills": ["Literacy Coach", "Child Psychology"],
                },
            ],
            "services": [
                {
                    "icon": "restaurant",
                    "title": "Cantine & sante / Dining & Health",
                    "text": "Le bien-etre physique soutient la reussite scolaire. Les repas sont prepares avec soin et une infirmerie assure le suivi quotidien. / Physical wellbeing supports school success. Meals are carefully prepared and an infirmary provides daily care.",
                    "points": [
                        "Menus frais et equilibres adaptes aux besoins des enfants. / Fresh balanced menus adapted to children's needs.",
                        "Infirmerie sur site pour les soins courants et les urgences. / On-site infirmary for routine care and emergencies.",
                        "Habitudes d'hygiene et routines de securite encadrees. / Supervised hygiene habits and safety routines.",
                    ],
                },
                {
                    "icon": "directions_bus",
                    "title": "Transport scolaire / School Transport",
                    "text": "Un service de navette fiable simplifie les trajets quotidiens des familles avec une priorite claire : securite et ponctualite. / A reliable shuttle service simplifies daily commutes with a clear focus on safety and punctuality.",
                    "points": [
                        "Trajets optimises sur les axes principaux de la ville. / Routes optimized along the city's main roads.",
                        "Chauffeurs certifies et sensibilises a la securite des enfants. / Certified drivers trained in child safety.",
                        "Communication avec les familles en cas d'ajustement d'itineraire. / Family communication when routes are adjusted.",
                    ],
                },
                {
                    "icon": "support_agent",
                    "title": "Maitresse volante / Substitute Teacher",
                    "text": "La continuite pedagogique est preservee meme en cas d'absence, avec un relais organise et suivi par la coordination. / Learning continuity is preserved during absences through organized cover monitored by coordination.",
                    "points": [
                        "Remplacement rapide des enseignants absents. / Quick replacement for absent teachers.",
                        "Progressions de classe suivies sans rupture. / Class progressions continue without disruption.",
                        "Soutien ponctuel dans les classes a besoin renforce. / Targeted support in classes with stronger needs.",
                    ],
                },
            ],
            "faqs": [
                {
                    "question": "Quels sont les horaires de l'ecole ? / What are the school hours?",
                    "answer": "Les cours se deroulent du lundi au vendredi, de 7h30 a 15h30. Des activites encadrees peuvent etre proposees apres les cours selon les inscriptions. / Classes run Monday to Friday, from 7:30 a.m. to 3:30 p.m. Supervised activities may be offered after class depending on registrations.",
                },
                {
                    "question": "L'uniforme est-il obligatoire ? / Is the uniform mandatory?",
                    "answer": "Oui. L'uniforme renforce le sentiment d'appartenance et l'egalite entre les eleves. Les informations pratiques sont disponibles a l'administration. / Yes. The uniform strengthens belonging and equality among students. Practical details are available from the administration.",
                },
                {
                    "question": "Comment le bilinguisme est-il organise ? / How is the bilingual curriculum structured?",
                    "answer": "Les apprentissages alternent francais et anglais afin de developper le vocabulaire academique dans les deux langues, avec une progression adaptee a chaque niveau. / Learning alternates between French and English to build academic vocabulary in both languages, with progression adapted to each level.",
                },
            ],
        },
    },
    {
        "key": "life",
        "title_fr": "Vie scolaire et communaute",
        "title_en": "School life and community",
        "subtitle_fr": "Une communaute vivante ou chaque enfant grandit grace au mentorat, aux activites et a l'implication des familles.",
        "subtitle_en": "A vibrant community where every student grows through engagement, mentorship and bilingual discovery.",
        "kind": "life",
        "sort_order": 50,
        "media_index": 3,
        "content": {
            "mentorship": [
                {
                    "icon": "psychology",
                    "title": "Mentorat personnalise / Personalized Support",
                    "text": "Des suivis individuels aident chaque eleve a progresser selon son rythme et ses besoins. / Individual follow-up helps each student progress at their own pace and according to their needs.",
                },
                {
                    "icon": "translate",
                    "title": "Excellence bilingue / Bilingual Excellence",
                    "text": "Les enseignants guident les enfants dans les deux langues avec des pratiques adaptees. / Teachers guide children in both languages with adapted practices.",
                },
            ],
            "activities": [
                {
                    "icon": "sports_soccer",
                    "title": "Sport & esprit d'equipe / Athletics & Teamwork",
                    "text": "Football, jeux collectifs et activites physiques pour developper leadership, discipline et cooperation. / Football, team games and physical activities build leadership, discipline and cooperation.",
                    "featured": True,
                },
                {
                    "icon": "palette",
                    "title": "Arts creatifs / Creative Arts",
                    "text": "Peinture, travaux manuels et expression visuelle pour stimuler l'imagination. / Painting, crafts and visual expression stimulate imagination.",
                    "featured": False,
                },
                {
                    "icon": "precision_manufacturing",
                    "title": "STEM & robotique / STEM & Robotics",
                    "text": "Defis logiques, technologie et initiation aux projets scientifiques. / Logic challenges, technology and introductory science projects.",
                    "featured": False,
                },
                {
                    "icon": "music_note",
                    "title": "Musique & chorale / Music & Choir",
                    "text": "Chants bilingues, rythme et confiance en soi par la scene. / Bilingual songs, rhythm and confidence through performance.",
                    "featured": False,
                },
            ],
            "community": {
                "title": "Association des Parents d'Eleves / Parent-Teacher Association",
                "text": "L'education est un partenariat. L'APE travaille avec l'administration pour organiser les evenements, soutenir les projets et maintenir un dialogue actif avec les familles. / Education is a partnership. The PTA works with administration to organize events, support projects and maintain active dialogue with families.",
                "points": [
                    "Reunions mensuelles et retours des familles. / Monthly meetings and family feedback.",
                    "Journees culturelles et celebrations saisonnieres. / Cultural days and seasonal celebrations.",
                    "Ateliers et projets portes par les parents. / Parent-led workshops and projects.",
                ],
            },
            "testimonials": [
                {
                    "name": "Mme Amandine N.",
                    "role": "Parent depuis 2021 / Parent since 2021",
                    "quote": "L'approche bilingue est naturelle et immersive. Ma fille passe du francais a l'anglais avec confiance. / The bilingual approach feels natural and immersive. My daughter switches from French to English with confidence.",
                    "featured": False,
                },
                {
                    "name": "Mr David Okafor",
                    "role": "Educateur senior / Senior educator",
                    "quote": "L'excellence n'est pas seulement une devise ici, elle se vit chaque jour dans les classes. / Excellence is not just a motto here; it is lived every day in the classrooms.",
                    "featured": True,
                },
                {
                    "name": "Marc-Antoine L.",
                    "role": "Eleve CM2 / Grade 5 student",
                    "quote": "J'aime les clubs apres l'ecole, surtout la robotique. On apprend en s'amusant. / I like the after-school clubs, especially robotics. We learn while having fun.",
                    "featured": False,
                },
            ],
        },
    },
    {
        "key": "events",
        "title_fr": "Evenements actuels et programmes",
        "title_en": "Current and scheduled events",
        "subtitle_fr": "Suivez les activites en cours et les prochaines dates importantes de l'ecole.",
        "subtitle_en": "Follow ongoing activities and upcoming important school dates.",
        "kind": "events",
        "sort_order": 55,
        "media_index": 4,
        "content": {
            "current": [
                {
                    "title": "Semaine culturelle / Cultural Week",
                    "date": "En cours / Ongoing",
                    "location": "Campus Tchemson-Kala",
                    "description": "Ateliers de langues, chants, danses et presentations de classes autour de la diversite culturelle. / Language workshops, songs, dances and class presentations around cultural diversity.",
                    "tag": "Actuel / Current",
                    "images": [],
                },
                {
                    "title": "Club lecture bilingue / Bilingual Reading Club",
                    "date": "Chaque mercredi / Every Wednesday",
                    "location": "Bibliotheque / Library",
                    "description": "Lecture accompagnee, vocabulaire et expression orale en francais et en anglais. / Guided reading, vocabulary and oral expression in French and English.",
                    "tag": "Hebdomadaire / Weekly",
                    "images": [],
                },
            ],
            "scheduled": [
                {
                    "title": "Journee portes ouvertes / Open Day",
                    "date": "20 Juillet 2026",
                    "location": "Nyom, quartier Kouassi",
                    "description": "Rencontre avec l'equipe, visite des classes et presentation du projet pedagogique bilingue. / Meet the team, visit classrooms and discover the bilingual education project.",
                    "tag": "Programme / Scheduled",
                    "images": [],
                },
                {
                    "title": "Rentree scolaire / Back to school",
                    "date": "02 Septembre 2026",
                    "location": "Campus Tchemson-Kala",
                    "description": "Accueil des familles, installation des eleves et lancement des activites de l'annee. / Family welcome, student onboarding and launch of the school year activities.",
                    "tag": "Important / Important",
                    "images": [],
                },
            ],
        },
    },
    {
        "key": "contact",
        "title_fr": "Contactez-nous",
        "title_en": "Get in touch",
        "subtitle_fr": "Nyom, quartier Kouassi, proche du lycee de Nyom.",
        "subtitle_en": "Nyom, Kouassi neighborhood, near Nyom high school.",
        "kind": "contact",
        "sort_order": 60,
        "media_index": 5,
        "content": {
            "phones": ["+237 242 052 139", "+237 699 078 398", "+237 699 105 745"],
            "email": "cdongmo@yahoo.fr",
            "hours": "Lun - Ven / Mon - Fri: 07:30 - 15:30",
            "address": "AKAK 1, Nyom, quartier Kouassi, Yaounde",
        },
    },
]


async def seed_defaults(session: AsyncSession) -> None:
    media_result = await session.execute(select(MediaAsset))
    media_by_filename = {media.filename: media for media in media_result.scalars()}

    media_assets: list[MediaAsset] = []
    for filename, content_type, alt_text, label, fill in DEFAULT_MEDIA:
        media = media_by_filename.get(filename)
        if media is None:
            media = MediaAsset(
                filename=filename,
                content_type=content_type,
                alt_text=alt_text,
                bytes_data=_svg_bytes(label, fill),
            )
            session.add(media)
        media_assets.append(media)

    await session.flush()

    section_result = await session.execute(select(PageSection))
    sections_by_key = {section.key: section for section in section_result.scalars()}

    for item in DEFAULT_SECTIONS:
        media_index = item["media_index"]
        section_data = {key: value for key, value in item.items() if key != "media_index"}
        existing = sections_by_key.get(item["key"])

        if existing is None:
            session.add(PageSection(**section_data, media_id=media_assets[media_index].id))
            continue

        existing_content = existing.content or {}
        should_enrich_services = item["key"] == "services" and "highlights" not in existing_content
        should_enrich_hero = item["key"] == "hero" and "academicYearStartMonth" not in existing_content
        should_enrich_life = item["key"] == "life" and "mentorship" not in existing_content
        should_enrich_events = item["key"] == "events" and (
            not isinstance(existing_content.get("current"), list)
            or any("images" not in event for event in existing_content.get("current", []) if isinstance(event, dict))
            or any("images" not in event for event in existing_content.get("scheduled", []) if isinstance(event, dict))
        )
        should_enrich_settings = item["key"] == "site-settings" and (
            "appBackgroundOverlay" not in existing_content
            or existing_content.get("appBackgroundOverlay") == "rgba(243, 250, 255, 0.84)"
            or existing_content.get("appBackgroundOverlay") == "rgba(249, 249, 252, 0.84)"
        )
        if should_enrich_settings:
            existing.content = {**section_data["content"], **existing_content, "appBackgroundOverlay": "rgba(249, 249, 252, 0.46)"}
            existing.kind = section_data["kind"]
            existing.media_id = media_assets[media_index].id
            continue
        if should_enrich_hero:
            existing.content = {**section_data["content"], **existing_content, "academicYearStartMonth": 9}
            existing.kind = section_data["kind"]
            existing.media_id = media_assets[media_index].id
            continue
        if should_enrich_services or should_enrich_life or should_enrich_events:
            for field, value in section_data.items():
                setattr(existing, field, value)
            existing.media_id = media_assets[media_index].id

    await session.commit()
