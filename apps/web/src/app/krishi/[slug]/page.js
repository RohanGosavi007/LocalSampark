import KrishiModulePage from '../components/KrishiModulePage';
import { RURAL_CATEGORIES, TOP_FEATURES } from '../../data/rural-services';

/**
 * /krishi/<module>: one route for every Krishi sub-module.
 *
 * There used to be 121 near-identical page files here, each a three-line
 * wrapper around KrishiModulePage with its own slug. They were the same page
 * 121 times, and adding a module meant adding a file. The catalogue
 * (data/rural-services.js) is the single list of modules, so the pages are
 * generated from it. A slug that is not in the catalogue is a 404, as a
 * missing folder was before.
 *
 * While the Krishi feature flag is off (it is at launch) middleware rewrites
 * every /krishi/... request to /coming-soon, so this page is reached only once
 * the module is switched on.
 */
const modulePaths = () => [
  ...RURAL_CATEGORIES.flatMap((category) => category.features || []),
  ...TOP_FEATURES,
]
  .map((feature) => /^\/krishi\/([^/]+)$/.exec(feature.path || '')?.[1])
  .filter(Boolean);

export const dynamicParams = false;

export function generateStaticParams() {
  return [...new Set(modulePaths())].map((slug) => ({ slug }));
}

export default async function KrishiModuleRoute({ params }) {
  const { slug } = await params;
  return <KrishiModulePage slug={slug} />;
}
