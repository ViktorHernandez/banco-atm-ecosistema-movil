#!/usr/bin/env bash
set -euo pipefail

CARPETA_RESPALDOS="${CARPETA_RESPALDOS:-./respaldos}"
RETENCION_DIAS="${RETENCION_DIAS:-14}"

cargar_entorno() {
  local raiz
  raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  if [[ -f "$raiz/.env" ]]; then
    set -a
    source "$raiz/.env"
    set +a
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL no esta definido." >&2
    exit 1
  fi
}

comprobar_herramientas() {
  for herramienta in "$@"; do
    if ! command -v "$herramienta" > /dev/null 2>&1; then
      echo "Falta la herramienta '$herramienta'." >&2
      echo "Instale el cliente de PostgreSQL antes de continuar." >&2
      exit 1
    fi
  done
}

respaldar() {
  comprobar_herramientas pg_dump
  mkdir -p "$CARPETA_RESPALDOS"

  local marca archivo
  marca="$(date +%Y%m%d-%H%M%S)"
  archivo="$CARPETA_RESPALDOS/banco-atm-$marca.dump"

  echo "Generando respaldo en $archivo"
  pg_dump --format=custom --no-owner --no-privileges \
    --file="$archivo" "$DATABASE_URL"

  if command -v sha256sum > /dev/null 2>&1; then
    sha256sum "$archivo" > "$archivo.sha256"
  fi

  local tamano
  tamano="$(du -h "$archivo" | cut -f1)"
  echo "Respaldo completado ($tamano)"

  find "$CARPETA_RESPALDOS" -name 'banco-atm-*.dump*' \
    -mtime "+$RETENCION_DIAS" -delete 2>/dev/null || true

  echo "$archivo"
}

listar() {
  mkdir -p "$CARPETA_RESPALDOS"
  echo "Respaldos disponibles en $CARPETA_RESPALDOS:"
  ls -1t "$CARPETA_RESPALDOS"/banco-atm-*.dump 2>/dev/null || echo "  (ninguno)"
}

verificar() {
  comprobar_herramientas pg_restore
  local archivo="${1:-}"

  if [[ -z "$archivo" ]]; then
    echo "Indique el archivo a verificar." >&2
    exit 1
  fi

  if [[ -f "$archivo.sha256" ]] && command -v sha256sum > /dev/null 2>&1; then
    sha256sum --check "$archivo.sha256"
  fi

  local tablas
  tablas="$(pg_restore --list "$archivo" | grep -c 'TABLE DATA' || true)"
  echo "El respaldo contiene $tablas tablas con datos."

  if [[ "$tablas" -lt 5 ]]; then
    echo "El respaldo parece incompleto." >&2
    exit 1
  fi

  echo "Respaldo integro."
}

restaurar() {
  comprobar_herramientas pg_restore
  local archivo="${1:-}"
  local destino="${2:-$DATABASE_URL}"

  if [[ -z "$archivo" || ! -f "$archivo" ]]; then
    echo "Indique un archivo de respaldo existente." >&2
    exit 1
  fi

  echo "Se restaurara '$archivo' sobre la base de datos indicada."
  echo "Esta operacion sobrescribe los datos actuales."
  read -r -p "Escriba RESTAURAR para continuar: " confirmacion

  if [[ "$confirmacion" != "RESTAURAR" ]]; then
    echo "Operacion cancelada."
    exit 1
  fi

  pg_restore --clean --if-exists --no-owner --no-privileges \
    --dbname="$destino" "$archivo"

  echo "Restauracion terminada. Ejecute 'npm run migration:run' para confirmar el esquema."
}

cargar_entorno

case "${1:-}" in
  respaldar) respaldar ;;
  listar) listar ;;
  verificar) verificar "${2:-}" ;;
  restaurar) restaurar "${2:-}" "${3:-}" ;;
  *)
    echo "Uso: $0 {respaldar|listar|verificar ARCHIVO|restaurar ARCHIVO [DESTINO]}"
    exit 1
    ;;
esac
