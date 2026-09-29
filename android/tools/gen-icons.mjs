// Generate ikon lucide (sama dengan web) menjadi ImageVector Compose, tanpa library ikon.
// Pakai dari root repo: node android/tools/gen-icons.mjs   (butuh web/node_modules/lucide-react)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ICONS = [
  'arrow-left', 'arrow-up', 'book-open', 'building-2', 'calendar-clock', 'camera', 'check', 'chevron-down', 'chevron-right',
  'circle-alert', 'circle-check', 'circle-ellipsis', 'download', 'eye', 'external-link', 'file-check-2', 'file-text', 'history',
  'hourglass', 'log-out', 'message-circle', 'paperclip', 'phone', 'printer', 'projector', 'quote', 'refresh-cw', 'shield-check',
  'snowflake', 'spray-can', 'ticket', 'upload', 'users', 'wifi', 'wifi-off', 'wrench', 'x', 'zap',
]

const root = path.resolve(import.meta.dirname, '../..')
const lucide = path.join(root, 'web/node_modules/lucide-react/dist/esm/icons')
const out = path.join(root, 'android/app/src/main/java/me/codewithus/layan/ui/Lucide.kt')

const n = (v) => Number(v ?? 0)
function toPath([tag, a]) {
  switch (tag) {
    case 'path': return a.d
    case 'line': return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`
    case 'circle': { const [cx, cy, r] = [n(a.cx), n(a.cy), n(a.r)]; return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0` }
    case 'polyline': case 'polygon': {
      const p = a.points.trim().split(/[\s,]+/)
      let d = `M${p[0]} ${p[1]}`
      for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`
      return tag === 'polygon' ? d + 'Z' : d
    }
    case 'rect': {
      const [x, y, w, h] = [n(a.x), n(a.y), n(a.width), n(a.height)]
      const r = Math.min(n(a.rx ?? a.ry), w / 2, h / 2)
      if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`
      return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
    }
    default: throw new Error(`elemen ${tag} belum didukung`)
  }
}

const camel = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const lines = []
for (const name of ICONS) {
  // nama lama (mis. file-check-2) hanya alias: ikuti ke file aslinya
  let file = path.join(lucide, `${name}.mjs`)
  const alias = fs.readFileSync(file, 'utf8').match(/export \{ default \} from '\.\/(.+?)'/)
  if (alias) file = path.join(lucide, alias[1])
  const mod = await import(pathToFileURL(file).href)
  const paths = mod.__iconData.node.map(toPath).map((d) => JSON.stringify(d)).join(', ')
  lines.push(`    val ${camel(name)} by lazy { icon("${name}", ${paths}) }`)
}

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, `// DIGENERATE oleh android/tools/gen-icons.mjs dari lucide-react (ISC). Jangan diedit manual.
package me.codewithus.layan.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

private fun icon(name: String, vararg d: String): ImageVector =
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        d.forEach {
            addPath(
                pathData = addPathNodes(it),
                fill = null,
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 2f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
    }.build()

object Lucide {
${lines.join('\n')}
}
`)
console.log(`${ICONS.length} ikon -> ${path.relative(root, out)}`)
