#!/usr/bin/env python3
"""يقارن قواعد lp-* بين ملف المرجع و landing.css ويكشف الناقص/المختلف.
الاستخدام: uv run python3 scripts/design/audit-landing-css.py
"""
import re, sys

REF = "/tmp/haa-design/ui_kits/landing/index.html"
IMPL = "apps/storefront/src/landing/landing.css"

def extract_style(html):
    # كل كتل <style>
    return "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))

def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)

def rules(css):
    """يرجع dict: selector-normalized -> set(declarations). يتعامل مع @media بتسطيح بسيط."""
    css = strip_comments(css)
    out = {}
    # أزل أغلفة @media مع الإبقاء على محتواها (نقارن القواعد ذاتها)
    # نلتقط كل block: selector { decls }
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        sel = m.group(1).strip()
        if sel.startswith("@"):           # @media/@keyframes header — تخطَّ السطر
            continue
        decls = m.group(2)
        norm = set()
        for d in decls.split(";"):
            d = d.strip()
            if not d: continue
            norm.add(re.sub(r"\s+", " ", d.lower()))
        for s in [x.strip() for x in sel.split(",")]:
            if "lp-" not in s:            # ركّز على نظام lp-*
                continue
            key = re.sub(r"\s+", " ", s.lower())
            out.setdefault(key, set()).update(norm)
    return out

ref = rules(extract_style(open(REF).read()))
impl = rules(open(IMPL).read())

missing = sorted(set(ref) - set(impl))
common = sorted(set(ref) & set(impl))

print(f"selectors lp-* في المرجع: {len(ref)} | في التنفيذ: {len(impl)}")
print(f"\n=== [{len(missing)}] selectors موجودة في المرجع ومفقودة في التنفيذ ===")
for s in missing:
    print("  -", s)

print(f"\n=== selectors بقواعد مختلفة (المرجع لديه declarations غير موجودة عندي) ===")
diffs=0
for s in common:
    only_ref = ref[s] - impl[s]
    if only_ref:
        diffs+=1
        print(f"  · {s}")
        for d in sorted(only_ref):
            print(f"      ناقص: {d}")
print(f"\nالمجموع: {len(missing)} مفقود، {diffs} مختلف")
sys.exit(1 if (missing or diffs) else 0)
