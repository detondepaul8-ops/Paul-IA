# -*- coding: utf-8 -*-
"""Génère un schéma Prisma SQLITE pour les tests locaux (identique au schéma
postgres de production, sans types natifs @db.*) — n'affecte jamais la prod."""
import re

src = open('prisma/schema.prisma').read()
out = src.replace('provider  = "postgresql"', 'provider  = "sqlite"')
out = out.replace('url       = env("DATABASE_URL")', 'url       = "file:/tmp/paul-test.db"')
out = re.sub(r'\n\s*directUrl\s*=\s*env\("DIRECT_URL"\)', '', out)
out = re.sub(r'\s*@db\.Text', '', out)
out = re.sub(r'\s*@db\.\w+', '', out)
open('prisma/schema.test.sqlite.prisma', 'w').write(out)
print('schéma de test généré : prisma/schema.test.sqlite.prisma')
print('provider:', 'sqlite' if 'sqlite' in out else 'ERREUR')
print('@db.* restants:', len(re.findall(r'@db\.', out)))
