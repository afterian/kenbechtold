// Curated results for the deck. Hand-transcribed from the research reports.
// Every block carries `src` (path relative to E:\Meshing_eval) so numbers can be re-checked.
// When the research updates, edit here; the page reads everything from window.RESULTS.
window.RESULTS = {
  snapshot: "2026-10-08 09:40 PDT",

  // ---------------------------------------------------------------- LIGHT lane
  normals: {
    src: "reports/normal_light_count_multiview.md",
    unit: "mean angular error (deg) vs scanned normals, lower is better",
    methods: ["GeoUniPS", "Uni MS-PS", "LINO-UniPS"],
    views: {
      "01": { GeoUniPS: [2.5069, 2.5443, 2.4799], "Uni MS-PS": [3.3814, 3.0702, 2.9704], "LINO-UniPS": [2.7322, 2.7452, 2.4035] },
      "06": { GeoUniPS: [5.9216, 6.6102, 4.7955], "Uni MS-PS": [4.7876, 4.3076, 3.6044], "LINO-UniPS": [4.7033, 3.9604, 3.2509] },
      "11": { GeoUniPS: [2.789, 2.6279, 2.4424], "Uni MS-PS": [3.9495, 3.6942, 3.4447], "LINO-UniPS": [3.3275, 3.1044, 2.672] },
    },
    counts: [5, 6, 16],
  },

  bridgeNormals: {
    src: "reports/bear_geo6_openrnb_bridge.md",
    geoMean: 3.6937, geoRange: [2.5189, 6.6154], sdmMean: 4.6936,
    views: 20, photosPerView: 6, inferenceSeconds: 497.21,
  },

  // ---------------------------------------------------------------- BEAR (DiLiGenT-MV, scanned GT, F @ 1.5 units)
  bear: {
    src: "reports/bear_geo6_openrnb_bridge.md; reports/supernormal_bear_refined.md",
    threshold: "1.5 dataset units, 100k seeded samples, no alignment",
    rows: [
      { id: "geo6_raw", name: "Six real photos → GeoUniPS → Open-RNb", kind: "raw", F: 0.86251, P: 0.77405, R: 0.97379, CD: 8.11193, faces: 437842, comps: 120 },
      { id: "sdm_raw", name: "Prepared SDM normals → Open-RNb", kind: "raw", F: 0.84867, P: 0.75939, R: 0.96174, CD: 7.30375, faces: 436506, comps: 83 },
      { id: "geo6_lc", name: "Six real photos → … (largest component)", kind: "derived", F: 0.9035, P: 0.84264, R: 0.97383, CD: 3.26686, faces: 399226, comps: 1 },
      { id: "sdm_lc", name: "Prepared SDM → … (largest component)", kind: "derived", F: 0.88055, P: 0.81191, R: 0.96187, CD: 3.72033, faces: 406160, comps: 1 },
      { id: "supernormal", name: "Prepared SDM normals → SuperNormal 5k", kind: "raw", F: 0.91195, P: 0.90185, R: 0.92227, CD: 1.4362, faces: 707096, comps: 21 },
    ],
  },

  // ---------------------------------------------------------------- LEGO (outline only)
  lego: {
    src: "reports/session_summary_20261008.md; gof_neus2_sugar.md; gaussian_wrapping_lego_30k_mesh.md; pgsr_lego_repo_settings_15000.md; toposurfel_lego_repo_settings_10000.md; neus2_lego_grid384.md; diagnostics/winding_corrections_20261008/audit.json",
    metric: "mean held-out silhouette IoU, 8 unseen views, 256 px. Outline only, not a 3D ranking",
    rows: [
      { m: "PGSR", note: "15k · repo settings", mesh: "lego_pgsr", iou: 0.978, family: "Planar Gaussians" },
      { m: "TopoSurfel", note: "10k · repo settings", mesh: "lego_topo", iou: 0.9779, family: "Surfels + mesh proxy" },
      { m: "2DGS", note: "30k + gated", mesh: "lego_2dgs_gated", iou: 0.9746, family: "Gaussian surfels" },
      { m: "GOF", note: "16k · winding fixed", mesh: "lego_gof16k", iou: 0.9723, family: "Gaussian opacity field" },
      { m: "NeuS2", note: "15k · 256 grid", mesh: "lego_neus2", iou: 0.9706, family: "Neural SDF" },
      { m: "GOF", note: "30k", iou: 0.9691, family: "Gaussian opacity field" },
      { m: "NeuS2", note: "15k · 384 grid", iou: 0.9673, family: "Neural SDF" },
      { m: "Gaussian Wrapping", note: "30k · winding fixed", mesh: "lego_gw", iou: 0.961, family: "Gaussian occupancy" },
      { m: "SuGaR", note: "stage 4 OBJ", mesh: "lego_sugar", iou: 0.95572, family: "Gaussian + Poisson" },
      { m: "2DGS", note: "30k raw (no gate)", mesh: "lego_2dgs_raw", iou: 0.4981, family: "Gaussian surfels" },
    ],
    gate: { before: 0.4981, after: 0.9746, pixelsRemoved: 5301186, facesBefore: 1768428, facesAfter: 717149 },
  },

  // ---------------------------------------------------------------- BUDDHA (DiLiGenT-MV, scanned GT, F @ 1% of scan diagonal = 2.07 units)
  buddha: {
    src: "reports/neus2_buddha.md; reports/buddha_geo6_openrnb_5k.md; reports/gs2m_buddha_glossy10k.md",
    threshold: "1% of scan bounding-box diagonal (2.07 dataset units), 100k seeded samples, no alignment",
    rows: [
      { m: "NeuS2 15k · one-light RGB", mesh: "buddha_neus2", lane: "views", F: 0.928, CD: 0.8755, iou: 0.97964, kind: "raw" },
      { m: "Six photos → Open-RNb · cleaned", mesh: "buddha_rnb_lc", lane: "surface", F: 0.926957, CD: 0.910769, iou: 0.987844, kind: "derived" },
      { m: "Six photos → Open-RNb · raw", mesh: "buddha_rnb_raw", lane: "surface", F: 0.89613, CD: 2.520973, iou: 0.98785, kind: "raw" },
      { m: "GS-2M 10k · glossy material", mesh: "buddha_gs2m", lane: "views", F: 0.738081, CD: 1.751946, iou: 0.94427, kind: "raw" },
    ],
  },

  // ---------------------------------------------------------------- PINK BOOT (Skoltech3D, F @ 1% of scan diagonal)
  boot: {
    src: "runs/2DGS/pink_boot/pink-rgb16-half-fullgeom-20261008-1302/result.md; reports/gof_pink_boot.md; open_rnb_pink_boot.md; supernormal_pink_boot_maskcrop.md",
    threshold: "1% of scan bounding-box diagonal (0.00408 dataset units), no alignment",
    rows: [
      { m: "2DGS 30k · gated + filtered", mesh: "boot_2dgs_filtered", lane: "views", F: 0.90674, CD: 0.00158, kind: "derived" },
      { m: "2DGS 30k · train-alpha gated", mesh: "boot_2dgs_gated", lane: "views", F: 0.90153, CD: 0.00165, kind: "raw" },
      { m: "GOF 30k", mesh: "boot_gof", lane: "views", F: 0.56527, CD: 0.01247, kind: "raw" },
      { m: "Open-RNb 5k · prepared normals", mesh: "boot_rnb", lane: "surface", F: 0.41632, CD: 0.0262228, kind: "raw" },
      { m: "SuperNormal 30k · mask crop", mesh: "boot_sn_crop", lane: "surface", F: 0.40628, CD: 0.0190054, kind: "raw" },
      { m: "SuperNormal 30k · full frame", lane: "surface", F: 0.37824, CD: 0.0185848, kind: "raw" },
      { m: "2DGS 30k · no gate", mesh: "boot_2dgs_unmasked", lane: "views", F: 0.08852, CD: 0.1007, kind: "raw" },
    ],
    gof: { precision: 0.39765, recall: 0.97717, windingConflict: 49.94, iou: 0.90816 },
    twodgs: { pixelsRemoved: 11519275, facesBefore: 2952444, facesAfter: 141580, iouBefore: 0.0725, iouAfter: 0.9322 },
    normalGap: 11.81, maskShareFull: 6.83,
  },

  // ---------------------------------------------------------------- CAMERAS (public bear)
  cameras: {
    src: "reports/alignment_initial_bear.md; runs/alignment/calibrated_bear20_comparison.md",
    calibrated: [
      { m: "VGGT + fixed-K PnP", center: 2.984, rot: 2.358, verdict: "recommended" },
      { m: "Pure VGGT (rigid)", center: 3.259, rot: 3.006, verdict: "control" },
      { m: "Pi3X native K", center: 9.275, rot: 7.835, verdict: "weaker" },
      { m: "MapAnything native K", center: 73.54, rot: 65.45, verdict: "reject" },
    ],
    focal: { predicted: 1147, measured: 3772 },
    bridge: { firstF: 0.004725, firstCD: 280.319, fixedF: 0.004808, fixedCD: 124.664, controlF: 0.862507 },
  },

  // ---------------------------------------------------------------- GENERATIVE (Chapter V): AI mesh generation
  // Outputs live in each model's own normalized space and carry no cameras, so nothing here is scored against a scan.
  generative: {
    src: "manifests/uniforge3d_*_completed_20261016.json; reports/uniforge3d_ram_guard_diagnostic_20261016.md; reports/uniforge3d_case01_shape512_geometry_20261016.md",
    // UniForge3D public runs (official commit 5b89056d, seed 42, four views, 1024 grid, 2048 px PBR textures)
    public: [
      { id: "gen_bear_uniforge", obj: "Bear", sub: "DiLiGenT-MV · views 01/06/11/16", faces: 985159, export: "official remesh", gpu: 18191, note: "export from saved decoded checkpoint", src: "manifests/uniforge3d_bear_remesh_from_decoded_completed_20261016.json" },
      { id: "gen_buddha_uniforge", obj: "Buddha", sub: "DiLiGenT-MV · views 01/06/11/16", faces: 992146, export: "no remesh", gpu: 12369, note: "chunked decode + bake 230.6 s", src: "manifests/uniforge3d_buddha_chunked_textured_no_remesh_completed_20261016.json" },
      { id: "gen_case01_uniforge", obj: "Figurine", sub: "UniForge3D official example case01", faces: 980705, export: "no remesh", gpu: 24055, note: "1,723 s wall · decode 1,352 s", src: "manifests/uniforge3d_public_textured_no_remesh_completed_20261016.json" },
    ],
  },

  // ---------------------------------------------------------------- Scorecard (Results at a glance)
  scorecard: [
    { object: "Bear", sub: "DiLiGenT-MV · smooth, matte", light: { v: "0.912", m: "SuperNormal F", s: "good", go: "p-bear" }, views: { v: "0.198", m: "2DGS one-light F (short run)", s: "bad" }, cams: { v: "2.98%", m: "VGGT + fixed K", s: "good", go: "p-camres" } },
    { object: "Lego", sub: "NeRF synthetic · textured", light: { v: "n/a", m: "single light only", s: "na" }, views: { v: "0.978", m: "PGSR outline IoU", s: "good", go: "p-lego" }, cams: { v: "given", m: "supplied poses", s: "na" } },
    { object: "Buddha", sub: "DiLiGenT-MV · fine carved detail", light: { v: "0.896", m: "six photos → Open-RNb F (raw)", s: "good", go: "p-buddha" }, views: { v: "0.928", m: "NeuS2 F (neural SDF)", s: "good", go: "p-buddha" }, cams: { v: "given", m: "supplied poses", s: "na" } },
    { object: "Pink boot", sub: "Skoltech3D · glossy footwear", light: { v: "0.416", m: "Open-RNb F", s: "bad", go: "p-cs4" }, views: { v: "0.902", m: "2DGS gated F", s: "good", go: "p-cs4" }, cams: { v: "pending", m: "RealityScan protocol", s: "open" } },
  ],

  // ---------------------------------------------------------------- Method atlas
  atlas: [
    { name: "GeoUniPS", lane: "light", role: "Photos under different lights → surface normals", status: "ran", stat: "3.69° mean, 20 views" },
    { name: "LINO-UniPS", lane: "light", role: "Universal photometric stereo, unknown lights", status: "ran", stat: "2.40° (16 lights, view 01)" },
    { name: "Uni MS-PS", lane: "light", role: "Multi-scale universal photometric stereo", status: "ran", stat: "2.97° (16 lights, view 01)" },
    { name: "Open-RNb", lane: "surface", role: "Normals (+reflectance) → neural signed-distance surface", status: "ran", stat: "F 0.863 bear (raw)" },
    { name: "SuperNormal", lane: "surface", role: "Multi-view normal integration → mesh", status: "ran", stat: "F 0.912 bear" },
    { name: "2DGS", lane: "views", role: "Flat Gaussian surfels → TSDF mesh", status: "ran", stat: "F 0.902 boot (gated)" },
    { name: "GOF", lane: "views", role: "Gaussian opacity field → marching tetrahedra", status: "ran", stat: "F 0.565 boot · IoU 0.972 Lego" },
    { name: "PGSR", lane: "views", role: "Planar Gaussians, multi-view geometry losses", status: "ran", stat: "IoU 0.978 Lego" },
    { name: "NeuS2", lane: "views", role: "Hash-grid neural SDF from RGB + masks", status: "ran", stat: "F 0.928 buddha · IoU 0.971 Lego" },
    { name: "Gaussian Wrapping", lane: "views", role: "Oriented Gaussians → occupancy surface", status: "ran", stat: "IoU 0.961 Lego" },
    { name: "SuGaR", lane: "views", role: "Surface-aligned Gaussians → Poisson mesh", status: "ran", stat: "IoU 0.956 Lego" },
    { name: "TopoSurfel", lane: "views", role: "Surfels + mesh proxy (PGSR seed)", status: "ran", stat: "IoU 0.978 Lego (10k corrected)" },
    { name: "VGGT", lane: "cameras", role: "Feed-forward camera + point prediction", status: "ran", stat: "2.98% / 2.36° (fixed-K)" },
    { name: "Pi3X", lane: "cameras", role: "Permutation-equivariant camera recovery", status: "ran", stat: "2.49% / 1.05° (10 views)" },
    { name: "MapAnything", lane: "cameras", role: "Universal metric 3D reconstruction", status: "ran", stat: "rejected on bear (native K)" },
    { name: "COLMAP · RealityScan", lane: "cameras", role: "Classic photogrammetry baselines", status: "pending", stat: "COLMAP 0 pairs on bear" },
    { name: "UniForge3D", lane: "gen", role: "Four photos, no cameras → textured mesh (generative)", status: "ran", stat: "≈985k faces · 2048² PBR · unscored" },
    { name: "Pixal3D", lane: "gen", role: "Posed multi-view photos → textured mesh (generative)", status: "ran", stat: "4 posed views · 1024 cascade" },
  ],
};
