import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Thay nội dung trong mảng này khi bạn muốn viết lời nhắn riêng của hai người.
const MESSAGES = [
  {
    title: "Một ngày rất đẹp",
    body: "Vì hôm nay là ngày một người thật đặc biệt xuất hiện trên thế giới này. Anh mong nhóc luôn thấy mình được yêu thương, kể cả trong những ngày bình thường nhất.",
  },
  {
    title: "Điều anh thích nhất",
    body: "Là được nghe ní kể đủ thứ chuyện nhỏ xíu, rồi tự nhiên cả ngày của anh cũng vui hơn.",
  },
  {
    title: "Sang tuổi mới",
    body: "Hi vọng nhóc sẽ bớt cao su và bùn ẻ mỗi khi anh qua đón muhaaha :333 ",
  },
  {
    title: "Mong cho hòn khén",
    body: "Có thật nhiều ngày nhẹ nhàng, nhiều tiếng cười, nhiều điều bất ngờ dễ thương, và một trái tim luôn biết mình xứng đáng với điều tốt đẹp.",
  },
  {
    title: "Về những vì sao",
    body: "Anh không thể tặng ní cả bầu trời, nhưng có thể gom một góc nhỏ của nó vào đây vì nhóc giống những vì sao vậy =))",
  },
  {
    title: "Thêm một tuổi mới",
    body: "Chúc ní có thêm can đảm cho điều muốn làm, thêm bình yên cho điều đang giữ, và thêm yêu bản thân mình mỗi ngày.",
  },
  {
    title: "Thật nhớ những lời càm ràm của nhóc",
    body: "Sang tuổi mới hi vọng sẽ được nghe nhiều lời càm ràm bên tai của ní hơn, dạo này không ở gần không được nghe cũng hơi bị nhớ é",
  },
  {
    title: "Chúc mừng nhóc :3",
    body: "Chúc mừng sinh nhật bạn hòn khén. Tuổi mới phải thật mạnh khỏe vui tươi nhé nhóc =))",
  },
];

const canvas = document.querySelector("#scene");
const letterHitLayer = document.querySelector("#letterHitLayer");
const startScreen = document.querySelector("#startScreen");
const startCopy = document.querySelector("#startCopy");
const startButton = document.querySelector("#startButton");
const startButtonText = document.querySelector("#startButtonText");
const loadingText = document.querySelector("#loadingText");
const passwordGate = document.querySelector("#passwordGate");
const passwordInput = document.querySelector("#passwordInput");
const passwordError = document.querySelector("#passwordError");
const letterPanel = document.querySelector("#letterPanel");
const closeLetter = document.querySelector("#closeLetter");
const letterNumber = document.querySelector("#letterNumber");
const letterTitle = document.querySelector("#letterTitle");
const letterBody = document.querySelector("#letterBody");
const openedCount = document.querySelector("#openedCount");
const messageCount = document.querySelector("#messageCount");
const today = document.querySelector("#today");
const finalNote = document.querySelector("#finalNote");
const sceneHint = document.querySelector("#sceneHint");

const BIRTHDAY_DISPLAY = "16 tháng 8, 2026";
const VALID_PASSWORDS = new Set(["16082004", "16802004"]);

messageCount.textContent = MESSAGES.length;
today.textContent = BIRTHDAY_DISPLAY;

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const isMobile = window.matchMedia(
  "(max-width: 640px), (pointer: coarse)",
).matches;
const usePostProcessing = !isMobile && !reducedMotion;
const targetFrameTime = isMobile ? 1000 / 30 : 0;
const maxPixelRatio = isMobile ? 1.1 : 1.5;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x09070f, 0.018);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  110,
);
camera.position.set(0, 1.1, 15.6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

let composer = null;
if (usePostProcessing) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48,
      0.58,
      0.7,
    ),
  );
  composer.addPass(new OutputPass());
}

const world = new THREE.Group();
world.rotation.x = -0.05;
scene.add(world);

const musicBox = new THREE.Group();
musicBox.position.y = isMobile ? -0.72 : 0.6;
world.add(musicBox);

const statuePivot = new THREE.Group();
musicBox.add(statuePivot);

const letters = [];
const letterHitTargets = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const projectedLetterPosition = new THREE.Vector3();
const clock = new THREE.Clock();
const openedLetters = new Set();
let running = false;
let activeMessage = -1;
const backgroundMusic = new Audio("./music_bg.mp3");
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";
backgroundMusic.volume = 0.34;

/* Previous synthesized music-box track, kept for later swaps.
let audioContext;
let musicTimer;
*/

const palette = {
  gold: 0xe7ba78,
  goldDeep: 0x895525,
  rose: 0xdd8497,
  roseDark: 0x4b1e34,
  glass: 0xd9fff2,
  paper: 0xf4ddbc,
};

function material(color, roughness = 0.45, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffd8bd, 0x10292e, 1.6));

  const key = new THREE.SpotLight(0xffd2a6, 65, 38, Math.PI / 5, 0.38, 1.5);
  key.position.set(7, 10, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.00035;
  key.target.position.set(0, 0.3, 0);
  scene.add(key, key.target);

  const rim = new THREE.PointLight(0x66c7c1, 9, 20, 2);
  rim.position.set(-7, 4, -5);
  scene.add(rim);

  const roseLight = new THREE.PointLight(0xe86c98, 5, 14, 2);
  roseLight.position.set(2.5, -1, 3.5);
  scene.add(roseLight);

  const pearlFill = new THREE.PointLight(0xffefd1, 4.5, 18, 2);
  pearlFill.position.set(-3.5, 2.2, 6.5);
  scene.add(pearlFill);

  const glassAura = new THREE.PointLight(0x8be8dc, 3.4, 15, 2);
  glassAura.position.set(-2.8, 4.6, 1.5);
  scene.add(glassAura);
}

function createStars() {
  const count = isMobile ? 560 : 1650;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(12, 56);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] =
      radius * Math.cos(phi) * 0.7 + THREE.MathUtils.randFloatSpread(4);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 8;

    color.setHSL(
      THREE.MathUtils.randFloat(0.06, 0.56),
      THREE.MathUtils.randFloat(0.35, 0.76),
      THREE.MathUtils.randFloat(0.63, 0.92),
    );
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const starfield = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  scene.add(starfield);
  return starfield;
}

function createBase() {
  const base = new THREE.Group();
  base.position.y = -3.1;
  musicBox.add(base);

  const radialSegments = isMobile ? 48 : 80;
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.37, 3.64, 0.58, radialSegments),
    material(palette.goldDeep, 0.23, 0.9),
  );
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  base.add(plinth);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(3.23, 3.23, 0.17, radialSegments),
    material(0xf1d3a1, 0.32, 0.55),
  );
  top.position.y = 0.36;
  top.castShadow = true;
  base.add(top);

  const velvet = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 2.65, 0.12, isMobile ? 40 : 64),
    material(palette.roseDark, 0.72),
  );
  velvet.position.y = 0.49;
  velvet.receiveShadow = true;
  base.add(velvet);

  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(3.28, 0.055, 8, radialSegments),
    material(palette.gold, 0.22, 0.92),
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.22;
  base.add(trim);

  const lowerTrim = trim.clone();
  lowerTrim.scale.setScalar(1.08);
  lowerTrim.position.y = -0.14;
  base.add(lowerTrim);

  const windingKey = new THREE.Group();
  windingKey.position.set(3.46, -0.08, 0);
  windingKey.rotation.z = Math.PI / 2;
  base.add(windingKey);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.55, 10),
    material(palette.gold, 0.2, 0.9),
  );
  shaft.rotation.z = Math.PI / 2;
  windingKey.add(shaft);
  [-0.22, 0.22].forEach((offset) => {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      material(palette.gold, 0.25, 0.9),
    );
    petal.scale.set(1.6, 0.6, 0.24);
    petal.position.set(0.28, offset, 0);
    windingKey.add(petal);
  });

  const glow = new THREE.PointLight(0xffb26c, 2.2, 8, 2);
  glow.position.y = 0.9;
  base.add(glow);
}

function createGlassGlobe() {
  const widthSegments = isMobile ? 36 : 64;
  const heightSegments = isMobile ? 28 : 48;
  const details = new THREE.Group();
  musicBox.add(details);

  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(3.08, widthSegments, heightSegments),
    new THREE.MeshBasicMaterial({
      color: 0xb9f4e7,
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  innerGlow.renderOrder = 2;
  details.add(innerGlow);

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(3.15, widthSegments, heightSegments),
    new THREE.MeshPhysicalMaterial({
      color: palette.glass,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.12,
      transmission: isMobile ? 0 : 0.16,
      thickness: 0.46,
      ior: 1.34,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: isMobile ? 0 : 0.12,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 360],
      specularIntensity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.renderOrder = 3;
  details.add(glass);

  const rimMaterial = new THREE.MeshBasicMaterial({
    color: 0xe5fff5,
    transparent: true,
    opacity: 0.31,
  });
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(3.16, 0.02, 8, isMobile ? 48 : 80),
    rimMaterial,
  );
  equator.rotation.x = Math.PI / 2;
  equator.renderOrder = 4;
  details.add(equator);

  const verticalRing = equator.clone();
  verticalRing.rotation.x = 0;
  verticalRing.rotation.z = Math.PI * 0.12;
  details.add(verticalRing);

  const outerRim = new THREE.Mesh(
    new THREE.TorusGeometry(3.17, 0.012, 8, isMobile ? 48 : 96),
    new THREE.MeshBasicMaterial({
      color: 0x9be9dc,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  outerRim.rotation.z = -Math.PI * 0.12;
  outerRim.renderOrder = 4;
  details.add(outerRim);

  const reflectionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const highlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 20),
    reflectionMaterial,
  );
  highlight.position.set(-1.27, 1.4, 2.7);
  highlight.rotation.z = -Math.PI / 6;
  highlight.scale.set(0.38, 1.35, 0.12);
  highlight.renderOrder = 5;
  highlight.userData.baseOpacity = reflectionMaterial.opacity;
  details.add(highlight);

  const sideHighlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    reflectionMaterial.clone(),
  );
  sideHighlight.position.set(-1.78, 0.22, 2.58);
  sideHighlight.rotation.z = -Math.PI / 7;
  sideHighlight.scale.set(0.18, 1.05, 0.06);
  sideHighlight.renderOrder = 5;
  sideHighlight.userData.baseOpacity = sideHighlight.material.opacity;
  details.add(sideHighlight);

  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    reflectionMaterial.clone(),
  );
  glint.position.set(1.58, 1.52, 2.63);
  glint.scale.set(0.14, 0.52, 0.05);
  glint.renderOrder = 5;
  glint.userData.baseOpacity = glint.material.opacity;
  details.add(glint);

  return { innerGlow, highlight, sideHighlight, glint, outerRim };
}

function createSparkles() {
  const sparkleGroup = new THREE.Group();
  const sparkleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe3a8,
    transparent: true,
    opacity: 0.76,
  });
  const geometry = new THREE.OctahedronGeometry(0.045, 0);
  const sparkleCount = isMobile ? 26 : 55;
  for (let index = 0; index < sparkleCount; index += 1) {
    const sparkle = new THREE.Mesh(geometry, sparkleMaterial);
    const radius = THREE.MathUtils.randFloat(3.4, 7.5);
    const angle = Math.random() * Math.PI * 2;
    sparkle.position.set(
      Math.cos(angle) * radius,
      THREE.MathUtils.randFloat(-3.8, 4.4),
      Math.sin(angle) * radius - 1,
    );
    sparkle.userData.phase = Math.random() * Math.PI * 2;
    sparkle.userData.speed = THREE.MathUtils.randFloat(0.6, 1.4);
    sparkleGroup.add(sparkle);
  }
  scene.add(sparkleGroup);
  return sparkleGroup;
}

function makeLetterTexture(index, isOpen = false) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = isMobile ? 256 : 512;
  textureCanvas.height = isMobile ? 336 : 672;
  const scale = textureCanvas.width / 512;
  const context = textureCanvas.getContext("2d");
  const colors = isOpen
    ? {
        background: "#9fd2c5",
        line: "#246d61",
        stamp: "#247a6b",
        text: "#174b45",
        heart: "#edfff8",
      }
    : {
        background: "#ead0a9",
        line: "#9d4e57",
        stamp: "#b24b61",
        text: "#672b3b",
        heart: "#f9d7b4",
      };
  context.fillStyle = colors.background;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.strokeStyle = colors.line;
  context.lineWidth = 7 * scale;
  context.strokeRect(
    22 * scale,
    22 * scale,
    textureCanvas.width - 44 * scale,
    textureCanvas.height - 44 * scale,
  );
  context.fillStyle = colors.line;
  context.beginPath();
  context.moveTo(28 * scale, 32 * scale);
  context.lineTo(textureCanvas.width / 2, textureCanvas.height / 2.28);
  context.lineTo(textureCanvas.width - 28 * scale, 32 * scale);
  context.stroke();
  context.fillStyle = colors.text;
  context.font = `${36 * scale}px Georgia`;
  context.textAlign = "center";
  context.fillText(
    isOpen ? "Đã mở" : `Lá thư ${String(index + 1).padStart(2, "0")}`,
    textureCanvas.width / 2,
    textureCanvas.height - 65 * scale,
  );
  const stampX = textureCanvas.width / 2;
  const stampY = textureCanvas.height / 2.42;
  context.fillStyle = colors.stamp;
  context.beginPath();
  context.arc(stampX, stampY, 48 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = colors.heart;
  context.font = `${42 * scale}px Georgia`;
  context.fillText("♥", stampX, stampY + 15 * scale);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLetters() {
  const envelopeGeometry = new THREE.PlaneGeometry(0.84, 1.1);
  const glowGeometry = new THREE.PlaneGeometry(1.02, 1.28);
  const hitAreaGeometry = new THREE.PlaneGeometry(1.38, 1.72);
  const hitAreaMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  MESSAGES.forEach((_, index) => {
    const envelope = new THREE.Mesh(
      envelopeGeometry,
      new THREE.MeshBasicMaterial({
        map: makeLetterTexture(index),
        color: 0xfff5df,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    const glow = new THREE.Mesh(
      glowGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xe9b66c,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    glow.position.z = -0.012;
    envelope.add(glow);
    const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
    hitArea.position.z = 0.035;
    hitArea.userData.index = index;
    envelope.add(hitArea);
    const angle = (index / MESSAGES.length) * Math.PI * 2 + 0.35;
    if (isMobile) {
      envelope.position.set(
        Math.cos(angle) * 2.48,
        Math.sin(angle) * 1.5 + 0.55,
        Math.sin(angle) * 0.34 - 0.25,
      );
    } else {
      const radius = index % 2 === 0 ? 5.15 : 6.1;
      envelope.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 1.8) * 1.72 + 0.3,
        Math.sin(angle) * 1.1 - 0.7,
      );
    }
    envelope.userData = {
      index,
      base: envelope.position.clone(),
      baseScale: isMobile ? 0.86 : 1,
      phase: index * 0.8,
      opened: false,
    };
    world.add(envelope);
    letters.push(envelope);

    const hitTarget = document.createElement("button");
    hitTarget.className = "letter-hit-target";
    hitTarget.type = "button";
    hitTarget.tabIndex = -1;
    hitTarget.setAttribute("aria-label", `Mở lá thư ${index + 1}`);
    hitTarget.addEventListener("click", () => {
      if (running) openMessage(index);
    });
    letterHitLayer.append(hitTarget);
    letterHitTargets.push(hitTarget);
  });
}

function createFinalHeart() {
  const heart = new THREE.Group();
  heart.visible = false;
  heart.position.set(0, 0.15, -1.9);
  const dotGeometry = new THREE.SphereGeometry(0.045, 10, 10);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffc27e });
  for (let step = 0; step < 95; step += 1) {
    const t = (step / 94) * Math.PI * 2;
    const x = 0.13 * Math.pow(Math.sin(t), 3);
    const y =
      0.1 *
      (13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t));
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(x * 11.2, y * 0.72, THREE.MathUtils.randFloatSpread(0.18));
    heart.add(dot);
  }
  world.add(heart);
  return heart;
}

function frameAndPlaceModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const tallestSide = Math.max(size.x, size.y, size.z);
  const scale = 4.8 / tallestSide;
  object.scale.setScalar(scale);

  // Căn tâm theo ngang/dọc để bộ ghế và nhân vật nằm đúng trong cầu thủy tinh.
  object.position.set(
    -center.x * scale,
    -box.min.y * scale - 2.68,
    -center.z * scale,
  );
  statuePivot.add(object);
}

function loadModel() {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => {
    const percent = total ? Math.round((loaded / total) * 100) : 0;
    loadingText.textContent = `Đang tải kỷ niệm ${percent}%`;
  };
  manager.onLoad = () => {
    loadingText.textContent = "Hộp nhạc đã sẵn sàng";
    startButton.disabled = false;
    startButtonText.textContent = "Mở hộp nhạc";
    window.__APP_READY__ = true;
  };
  manager.onError = () => {
    loadingText.textContent = "Không thể tải một phần của hộp nhạc";
  };

  const loader = new GLTFLoader(manager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    "./MainChar.optimized.glb",
    (gltf) => {
      gltf.scene.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = !isMobile;
        child.receiveShadow = !isMobile;
        child.frustumCulled = true;
        if (child.material) {
          child.material.envMapIntensity = 0.9;
        }
      });
      frameAndPlaceModel(gltf.scene);
    },
    undefined,
    () => {
      loadingText.textContent = "Không tải được model đã tối ưu";
      startButtonText.textContent = "Thử mở hộp nhạc";
      startButton.disabled = false;
      window.__APP_READY__ = true;
    },
  );
}

function updateOpenedCount() {
  openedCount.textContent = openedLetters.size;
}

function openMessage(index) {
  const note = MESSAGES[index];
  activeMessage = index;
  letterNumber.textContent = `LÁ THƯ ${String(index + 1).padStart(2, "0")}`;
  letterTitle.textContent = note.title;
  letterBody.textContent = note.body;
  letterPanel.classList.add("is-open");
  letterPanel.setAttribute("aria-hidden", "false");

  if (!openedLetters.has(index)) {
    openedLetters.add(index);
    const letter = letters[index];
    letter.userData.opened = true;
    letter.material.map.dispose();
    letter.material.map = makeLetterTexture(index, true);
    letter.material.color.set(0xd5fff1);
    letter.children[0].material.color.set(0x6ce0c5);
    letter.children[0].material.opacity = 0.28;
    letter.material.needsUpdate = true;
    updateOpenedCount();

    if (openedLetters.size === MESSAGES.length) {
      setTimeout(() => {
        finalHeart.visible = true;
        finalNote.classList.add("is-open");
        finalNote.setAttribute("aria-hidden", "false");
        sceneHint.textContent = "Anh hy vọng em đã mỉm cười một chút.";
      }, 350);
    }
  }
}

function closeMessage() {
  activeMessage = -1;
  letterPanel.classList.remove("is-open");
  letterPanel.setAttribute("aria-hidden", "true");
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getLetterHit(event) {
  const rayHit = raycaster
    .intersectObjects(letters, true)
    .find((intersection) =>
      Number.isInteger(intersection.object.userData.index),
    );
  if (rayHit) return rayHit;

  // The transparent glass can shift a letter's rendered position slightly.
  // Fall back to a generous screen-space target so visible inner letters stay tappable.
  const rect = canvas.getBoundingClientRect();
  const maxDistance = isMobile ? 132 : 190;
  let closestLetter = null;
  let closestDistance = maxDistance;

  letters.forEach((letter) => {
    letter.getWorldPosition(projectedLetterPosition).project(camera);
    const screenX =
      rect.left + (projectedLetterPosition.x + 1) * rect.width * 0.5;
    const screenY =
      rect.top + (1 - projectedLetterPosition.y) * rect.height * 0.5;
    const distance = Math.hypot(
      event.clientX - screenX,
      event.clientY - screenY,
    );
    if (distance < closestDistance) {
      closestLetter = letter;
      closestDistance = distance;
    }
  });

  return closestLetter ? { object: closestLetter } : undefined;
}

function handleTap(event) {
  if (!running) return;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = getLetterHit(event);
  if (hit) {
    openMessage(hit.object.userData.index);
  } else if (activeMessage !== -1) {
    closeMessage();
  }
}

function startMusic() {
  backgroundMusic.play().catch(() => {
    sceneHint.textContent = "Chạm lại một lần để bật nhạc nền.";
  });

  /* Previous synthesized music-box track, kept for later swaps.
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 698.46];
  let index = 0;
  const playNote = () => {
    if (!audioContext || audioContext.state === 'suspended') return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = notes[index % notes.length];
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.72);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.75);
    index += 1;
  };
  playNote();
  musicTimer = window.setInterval(playNote, 760);
  */
}

function startExperience() {
  running = true;
  letterHitLayer.classList.add("is-active");
  passwordGate.setAttribute("aria-hidden", "true");
  startScreen.classList.remove("is-password-step");
  startScreen.classList.add("is-hidden");
  sceneHint.textContent = "Chạm vào những phong thư đang bay quanh hộp nhạc";
  startMusic();
}

function showPasswordGate() {
  startCopy.setAttribute("aria-hidden", "true");
  passwordGate.setAttribute("aria-hidden", "false");
  passwordError.textContent = "";
  passwordInput.value = "";
  startScreen.classList.add("is-password-step");
  window.setTimeout(() => passwordInput.focus(), 220);
}

function submitPassword(event) {
  event.preventDefault();
  const password = passwordInput.value.replace(/\D/g, "");
  if (VALID_PASSWORDS.has(password)) {
    startExperience();
    return;
  }

  passwordError.textContent = "Mật mã chưa đúng, thử lại nhé.";
  passwordInput.select();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.position.z = width < 641 ? 18.7 : 15.6;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.setSize(width, height, false);
  if (composer) composer.setSize(width, height);
}

function updateLetterHitTargets() {
  const rect = canvas.getBoundingClientRect();

  letters.forEach((letter, index) => {
    const hitTarget = letterHitTargets[index];
    letter.getWorldPosition(projectedLetterPosition).project(camera);

    const visible =
      projectedLetterPosition.z > -1 &&
      projectedLetterPosition.z < 1 &&
      projectedLetterPosition.x > -1.2 &&
      projectedLetterPosition.x < 1.2 &&
      projectedLetterPosition.y > -1.2 &&
      projectedLetterPosition.y < 1.2;

    hitTarget.hidden = !visible;
    hitTarget.style.left = `${(projectedLetterPosition.x + 1) * rect.width * 0.5}px`;
    hitTarget.style.top = `${(1 - projectedLetterPosition.y) * rect.height * 0.5}px`;
    hitTarget.style.transform = "translate(-50%, -50%)";
  });
}

const starfield = createStars();
const sparkles = createSparkles();
const finalHeart = createFinalHeart();
addLights();
createBase();
const glassDetails = createGlassGlobe();
createLetters();
loadModel();

startButton.addEventListener("click", showPasswordGate);
passwordGate.addEventListener("submit", submitPassword);
passwordInput.addEventListener("input", () => {
  passwordError.textContent = "";
});
closeLetter.addEventListener("click", closeMessage);
canvas.addEventListener("click", handleTap);
canvas.addEventListener("pointermove", (event) => {
  if (!running) return;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  canvas.style.cursor = getLetterHit(event) ? "pointer" : "default";
});
window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => {
  backgroundMusic.pause();

  /* Previous synthesized music-box cleanup.
  if (musicTimer) window.clearInterval(musicTimer);
  if (audioContext) audioContext.close();
  */
});

let lastRenderTime = 0;
function animate(frameTime = 0) {
  requestAnimationFrame(animate);
  if (
    document.hidden ||
    (targetFrameTime && frameTime - lastRenderTime < targetFrameTime)
  )
    return;
  lastRenderTime = frameTime;
  const elapsed = clock.getElapsedTime();
  const drift = reducedMotion ? 0 : 1;

  world.rotation.y = Math.sin(elapsed * 0.11) * 0.085 * drift;
  starfield.rotation.y = elapsed * 0.006 * drift;
  sparkles.rotation.y = elapsed * 0.04 * drift;

  if (running) {
    statuePivot.rotation.y = elapsed * 0.21 * drift;
    musicBox.rotation.y = Math.sin(elapsed * 0.35) * 0.035 * drift;
  }

  letters.forEach((letter, index) => {
    const { base, baseScale, phase, opened } = letter.userData;
    const floatStrength = opened ? 0.09 : 0.17;
    letter.position.y =
      base.y + Math.sin(elapsed * 0.9 + phase) * floatStrength * drift;
    letter.lookAt(camera.position);
    letter.scale.setScalar((opened ? 0.9 : 1) * baseScale);
  });

  updateLetterHitTargets();

  const glassPulse = 0.84 + Math.sin(elapsed * 1.15) * 0.16 * drift;
  glassDetails.innerGlow.material.opacity = 0.04 + glassPulse * 0.012;
  [glassDetails.highlight, glassDetails.sideHighlight, glassDetails.glint].forEach(
    (reflection, index) => {
      reflection.material.opacity =
        reflection.userData.baseOpacity *
        (0.8 + Math.sin(elapsed * 1.25 + index * 1.7) * 0.14 * drift);
    },
  );
  glassDetails.outerRim.material.opacity = 0.19 + glassPulse * 0.08;

  sparkles.children.forEach((sparkle) => {
    const pulse =
      0.72 +
      Math.sin(elapsed * sparkle.userData.speed + sparkle.userData.phase) *
        0.28;
    sparkle.scale.setScalar(pulse);
  });

  if (finalHeart.visible) {
    finalHeart.rotation.y = Math.sin(elapsed * 0.36) * 0.22;
    finalHeart.children.forEach((dot, index) => {
      const pulse = 0.75 + Math.sin(elapsed * 2.4 + index * 0.21) * 0.25;
      dot.scale.setScalar(pulse);
    });
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

resize();
animate();
