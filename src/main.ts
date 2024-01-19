import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'lil-gui'
import Stats from 'stats.js'
import './main.css'

// 3D的Game of life
// 將原本的2D的Game of life改成3D的
// 可用參數：長寬高 存活條件上下限
// render在canvas上

// 長寬高都先暫訂10
// 更新頻率設為 200ms
// 存活條件上下限設為 5 - 8

// 先暫時不管game of life的邏輯 先試著把數據標記出來
// 每一個點是一個8面體 0的是半徑為3 1的是半徑為5
// 每個中心間距為10

// 紀錄: xyz軸的方向 x右正 y上正 z出螢幕正
// (0, 0, 0)預設在畫面正中心而非左上

type Geometries = {
  [key: string]: THREE.PolyhedronGeometry
}

type Materials = {
	[key: string]: THREE.Material
}

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let renderer: THREE.WebGLRenderer
let running: boolean = false
let dataChanged: boolean = false
let data: number[][][]
// 用來計算定位的一個空物件
const dummy = new THREE.Object3D()

// geometries
let geometries: Geometries = {}
// materials
let materials: Materials = {}

// 操作設定
const gui = new GUI()
const guiData = {
	width: 10,
	height: 10,
	depth: 10,
	initial: 0.3,
	min: 5,
	max: 13,
	start: start,
	stop: stop,
	mode: 'size'
}

gui.add(guiData, 'width', 10, 100, 1).onChange(changed)
gui.add(guiData, 'height', 10, 100, 1).onChange(changed)
gui.add(guiData, 'depth', 10, 100, 1).onChange(changed)
gui.add(guiData, 'initial', 0, 1, 0.1).onChange(changed)
gui.add(guiData, 'min', 0, 26, 1).onChange(changed)
gui.add(guiData, 'max', 0, 26, 1).onChange(changed)
gui.add(guiData, 'mode', ['color', 'size']).onChange(changed)
gui.add(guiData, 'start')
gui.add(guiData, 'stop')

// fps
const stats = new Stats()
document.body.appendChild(stats.dom)

// 輔助函數 計算某個點周圍的活著的數量 用來判斷下一個狀態
function countAround(x: number, y: number, z: number): number {
	let max = guiData.max
	let min = guiData.min
	let count = 0
	for(let i = -1; i <= 1; i++) {
		for(let j = -1; j <= 1; j++) {
			for(let k = -1; k <= 1; k++) {
				if(i === 0 && j === 0 && k === 0) continue
				// 不循環
				let temp1 = x + i
				let temp2 = y + j
				let temp3 = z + k
				data[temp1] && data[temp1][temp2] && data[temp1][temp2][temp3] && data[temp1][temp2][temp3] === 1 && count++
				if(count > max) return 0
			}
		}
	}
	return count > min ? 1 : 0
}

function calc() {
	// 計算所有格子的下一個狀態
	let output: number[][][] = []
	for(let i = 0; i < guiData.width; i++) {
		output[i] = []
		for(let j = 0; j < guiData.height; j++) {
			output[i][j] = []
			for(let k = 0; k < guiData.depth; k++) {
				output[i][j][k] = countAround(i, j, k)
			}
		}
	}
	data = output
}

function draw(count: number) {
	// 先清空場景
	// CHECK: 光源不會變 有沒有辦法只清空別的東西
	scene.clear()

	// 定義光源
	const light1 = new THREE.DirectionalLight(0xffffff, 3)
	const light2 = new THREE.DirectionalLight(0xffffff, 3)
	const light3 = new THREE.DirectionalLight(0xffffff, 3)

	light1.position.set(0, 200, 0)
	light2.position.set(100, 200, 100)
	light3.position.set(-100, -200, -100)

	scene.add(light1)
	scene.add(light2)
	scene.add(light3)

	// 遍歷data 定義點的位置和數量
	// let number = 0
	let offsetX = -guiData.width / 2
	let offsetY = -guiData.height / 2
	let offsetZ = -guiData.depth / 2

	let small_count = 0
	let small_positions = []
	let big_count = 0
	let big_positions = []
	for(let i = 0; i < guiData.width; i++) {
		for(let j = 0; j < guiData.height; j++) {
			for(let k = 0; k < guiData.depth; k++) {
				if(data[i][j][k] === 0) {
					small_count++
					small_positions.push((i + offsetX) * 10, (j + offsetY) * 10, (k + offsetZ) * 10)
				} else {
					big_count++
					big_positions.push((i + offsetX) * 10, (j + offsetY) * 10, (k + offsetZ) * 10)
				}
			}
		}
	}

	// 設定instancedMesh
	let small_mesh: THREE.InstancedMesh, big_mesh: THREE.InstancedMesh

	switch(guiData.mode) {
		case 'color':
			small_mesh = new THREE.InstancedMesh(geometries['small'], materials['red'], small_count)
			big_mesh = new THREE.InstancedMesh(geometries['small'], materials['blue'], big_count)
			break
		case 'size':
			small_mesh = new THREE.InstancedMesh(geometries['small'], materials['red'], small_count)
			big_mesh = new THREE.InstancedMesh(geometries['big'], materials['blue'], big_count)
			break
		default:
			small_mesh = new THREE.InstancedMesh(geometries['small'], materials['red'], small_count)
			big_mesh = new THREE.InstancedMesh(geometries['small'], materials['blue'], big_count)
	}

	// 轉換成bufferAttribute
	const small_positions_buffer = new THREE.Float32BufferAttribute(small_positions, 3)
	const big_positions_buffer = new THREE.Float32BufferAttribute(big_positions, 3)

	for(let i = 0; i < small_count; i++) {
		dummy.position.fromBufferAttribute(small_positions_buffer, i)
		dummy.scale.set(1 + count / 50, 1 + count / 50, 1 + count / 50)
		dummy.updateMatrix()
		small_mesh.setMatrixAt(i, dummy.matrix)
	}

	for(let i = 0; i < big_count; i++) {
		dummy.position.fromBufferAttribute(big_positions_buffer, i)
		dummy.scale.set(1, 1, 1)
		dummy.updateMatrix()
		big_mesh.setMatrixAt(i, dummy.matrix)
	}

	small_mesh.instanceMatrix.needsUpdate = true
	big_mesh.instanceMatrix.needsUpdate = true


	// add to scene
	scene.add(small_mesh)
	scene.add(big_mesh)

	// 調整camera的位置
	if(dataChanged) {
		camera.position.set(0, 0, guiData.depth * 5 + 50)
		dataChanged = false
	}

	controls.update()

	renderer.render(scene, camera)
}

// 每10次step才跑一次calc
let count = 0
function step() {
	if(!running) return
	count++
	if(count % 2 === 0) {
		if(count === 10) {
			calc()
			count = 0
		}
		draw(count)
		stats.update()
	}
	requestAnimationFrame(step)
}

function initScene() {
	// 初始化scene
	scene = new THREE.Scene()
	scene.background = new THREE.Color(0xffffff)

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	// 設定camera的位置
	camera.position.set(0, 0, 80)
	// 設定camera看向哪個方向
	camera.lookAt(0, 0, 0)

	renderer = new THREE.WebGLRenderer()
	renderer.setSize(window.innerWidth, window.innerHeight)

	controls = new OrbitControls(camera, renderer.domElement)
	controls.autoRotate = true
	controls.autoRotateSpeed = 1

	document.body.appendChild(renderer.domElement)
}

function initData() {
	// 初始化data
	// 取得長寬高和初始機率
	// 產生data
	data = []
	for(let i = 0; i < guiData.width; i++) {
		data[i] = []
		for(let j = 0; j < guiData.height; j++) {
			data[i][j] = []
			for(let k = 0; k < guiData.depth; k++) {
				data[i][j][k] = Math.random() < guiData.initial ? 1 : 0
			}
		}
	}
}

function initGeometryAndMaterial() {
	// 不能用點的效果 很糟糕 點放大之後是方的
	// 繪製八面體
	geometries['small'] = new THREE.OctahedronGeometry(1.5)
	geometries['big'] = new THREE.OctahedronGeometry(1)
	materials['blue'] = new THREE.MeshPhongMaterial({
		color: 0x156289,
		// emissive: 0xff0000, // 不太能理解emissive的意思 本身發光?
		side: THREE.DoubleSide,
		flatShading: true
	})
	materials['red'] = new THREE.MeshPhongMaterial({
		color: 0xb91c1c,
		// emissive: 0xff0000, // 不太能理解emissive的意思 本身發光?
		side: THREE.DoubleSide,
		flatShading: true
	})
}


function init() {
	initScene()
	initGeometryAndMaterial()
	initData()
}

function start() {
	if(running) return
	running = true
	initData()
	step()
}

function stop() {
	running = false
}

function restart() {
	initData()
}

function changed() {
	dataChanged = true
	if(running) restart()
}

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onResize)

init()