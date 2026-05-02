import shutil
import os

# Origen (Caché interna de mis imágenes)
sources = [
    r"C:/Users/user/.gemini/antigravity/brain/307a7533-0f8c-41d9-be6d-98de76a0b7a3/lanzamiento_masbarato_deals_1768542313770.png",
    r"C:/Users/user/.gemini/antigravity/brain/307a7533-0f8c-41d9-be6d-98de76a0b7a3/multi_store_promo_1768542507269.png",
    r"C:/Users/user/.gemini/antigravity/brain/307a7533-0f8c-41d9-be6d-98de76a0b7a3/real_time_alerts_1768542523528.png"
]

# Destino SEGURO (Dentro de la carpeta del proyecto)
target_dir = r"C:/Users/user/Desktop/aplicacion PH/MasbaratoDeals/KIT_MARKETING"

# Nombres finales amigables
file_names = [
    "1_BANNER_LANZAMIENTO.png",
    "2_PROMO_MULTI_TIENDA.png",
    "3_PROMO_ALERTAS_MOVIL.png"
]

print(f"📂 Guardando en: {target_dir}")

for src, name in zip(sources, file_names):
    dst = os.path.join(target_dir, name)
    try:
        shutil.copy2(src, dst)
        print(f"✅ Guardado: {name}")
    except Exception as e:
        print(f"❌ Error con {name}: {e}")

print("🎉 ¡Kit de Marketing listo!")
