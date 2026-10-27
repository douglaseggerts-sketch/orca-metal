"""Troca o ícone padrão do Android pelo ícone do Orça Metal."""
import os, shutil
from PIL import Image

src = Image.open('www/icons/icon-512.png').convert('RGBA')
res = 'android/app/src/main/res'
shutil.rmtree(res + '/mipmap-anydpi-v26', ignore_errors=True)
for dens, size in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    pasta = '%s/mipmap-%s' % (res, dens)
    os.makedirs(pasta, exist_ok=True)
    for nome in ('ic_launcher', 'ic_launcher_round'):
        src.resize((size, size), Image.LANCZOS).save('%s/%s.png' % (pasta, nome))
print('icones atualizados')
