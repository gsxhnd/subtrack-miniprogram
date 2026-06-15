import { defineConfig } from "weapp-vite/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 修正 common.js 中 require.async 路径
 * 源码路径 '../pkg-icons/index' 在合并到 common.js（根目录）后无效
 * 需要改为 './pkg-icons/index'
 */
function fixSubpackagePaths(): any {
  return {
    name: "fix-subpackage-paths",
    closeBundle() {
      const commonPath = resolve(__dirname, "dist/common.js");
      if (existsSync(commonPath)) {
        let content = readFileSync(commonPath, "utf-8");
        content = content.replace(
          /require\.async\(`\.\.\/pkg-icons\/index`/g,
          'require.async(`./pkg-icons/index`',
        );
        writeFileSync(commonPath, content);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  console.log("[mode]:", mode);
  return {
    plugins: [fixSubpackagePaths()],
    weapp: {
      srcRoot: "src",
      generate: {
        extensions: {
          js: "ts",
          wxss: "scss",
        },
        dirs: {
          component: "src/components",
          page: "src/pages",
        },
      },
      subPackages: {
        "pkg-icons": {
          independent: false,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api", "import"],
        },
      },
    },
  };
});
