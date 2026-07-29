import './style.css'
import district1GeoJsonRaw from './data/district-1.geojson?raw'
import district2GeoJsonRaw from './data/district-2.geojson?raw'
import district3GeoJsonRaw from './data/district-3.geojson?raw'
import district6GeoJsonRaw from './data/district-6.geojson?raw'
import district15GeoJsonRaw from './data/district-15.geojson?raw'
import district17GeoJsonRaw from './data/district-17.geojson?raw'

const district1GeoJson = JSON.parse(district1GeoJsonRaw)
const district2GeoJson = JSON.parse(district2GeoJsonRaw)
const district3GeoJson = JSON.parse(district3GeoJsonRaw)
const district6GeoJson = JSON.parse(district6GeoJsonRaw)
const district15GeoJson = JSON.parse(district15GeoJsonRaw)
const district17GeoJson = JSON.parse(district17GeoJsonRaw)

document.querySelector('#app').innerHTML = `
  <main class="page">
    <header class="hero">
      <div class="hero__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"></path>
          <circle cx="12" cy="9" r="2.5"></circle>
        </svg>
      </div>
      <p class="eyebrow">우리 동네 지구 안내</p>
      <h1>신도림 지구 찾기</h1>
      <p class="description">주소를 입력하면 해당 주소가 몇 지구인지 알려드립니다.</p>
    </header>

    <section class="search-section" aria-labelledby="search-heading">
      <h2 id="search-heading" class="visually-hidden">주소 검색</h2>
      <form class="search-form" id="search-form">
        <label for="address" class="visually-hidden">도로명주소 또는 건물명</label>
        <div class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5"></circle>
            <path d="m16 16 4 4"></path>
          </svg>
          <input
            id="address"
            name="address"
            type="search"
            placeholder="도로명주소나 건물명을 입력하세요"
            autocomplete="street-address"
          />
        </div>
        <button type="submit">검색</button>
      </form>
    </section>

    <section class="result-card" aria-labelledby="result-heading" aria-live="polite">
      <div class="section-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"></path>
          <circle cx="12" cy="9" r="2.5"></circle>
        </svg>
      </div>
      <div>
        <h2 id="result-heading">검색 결과</h2>
        <p id="result-message">주소를 입력해 주세요.</p>
      </div>
    </section>

    <section class="map-section" aria-labelledby="map-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">위치 확인</p>
          <h2 id="map-heading">지도</h2>
        </div>
      </div>
      <div class="map-container" id="map">
        <div class="map-status" id="map-status" role="status">
          <div class="map-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"></path>
              <circle cx="12" cy="9" r="2.5"></circle>
            </svg>
          </div>
          <p>지도를 불러오는 중입니다.</p>
        </div>
      </div>
      <noscript>
        <div class="map-fallback">
          <svg viewBox="0 0 24 24">
            <path d="M12 8v5"></path>
            <circle cx="12" cy="17" r=".5"></circle>
          </svg>
          <p>지도를 보려면 자바스크립트를 사용해 주세요.</p>
        </div>
      </noscript>
      ${
        import.meta.env.DEV
          ? `
            <aside class="boundary-tool" aria-labelledby="boundary-tool-heading">
              <div class="boundary-tool__heading">
                <div>
                  <p class="eyebrow">개발 전용 도구</p>
                  <h3 id="boundary-tool-heading">17지구 경계 입력</h3>
                </div>
                <span class="boundary-tool__badge">개발 환경</span>
              </div>
              <p class="boundary-tool__guide" id="boundary-guide">
                경계 그리기 버튼을 누른 뒤 지도에서 꼭짓점을 차례대로 선택하세요.
              </p>
              <div class="boundary-tool__actions">
                <button type="button" class="boundary-button boundary-button--primary" id="boundary-start">
                  17지구 경계 그리기
                </button>
                <button type="button" class="boundary-button" id="boundary-undo">
                  마지막 점 취소
                </button>
                <button type="button" class="boundary-button" id="boundary-reset">
                  전체 초기화
                </button>
                <button type="button" class="boundary-button boundary-button--complete" id="boundary-complete">
                  경계 완성
                </button>
              </div>
              <div class="geojson-result" id="geojson-result" hidden>
                <div class="geojson-result__heading">
                  <h4>완성된 GeoJSON 좌표</h4>
                  <button type="button" class="boundary-button" id="boundary-copy">좌표 복사</button>
                </div>
                <pre id="geojson-output"></pre>
              </div>
            </aside>
          `
          : ''
      }
    </section>
  </main>
`

const searchForm = document.querySelector('#search-form')
const addressInput = document.querySelector('#address')
const resultMessage = document.querySelector('#result-message')
const searchButton = searchForm.querySelector('button[type="submit"]')
const mapContainer = document.querySelector('#map')
const mapStatus = document.querySelector('#map-status')
const kakaoJavaScriptKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY

let map
let marker
let geocoder
let places
let searchSequence = 0
let boundaryCoordinates = []
let boundaryMarkers = []
let boundaryPolyline
let boundaryPolygon
let boundaryDrawingActive = false
let boundaryComplete = false

const boundaryTool = import.meta.env.DEV
  ? {
      startButton: document.querySelector('#boundary-start'),
      undoButton: document.querySelector('#boundary-undo'),
      resetButton: document.querySelector('#boundary-reset'),
      completeButton: document.querySelector('#boundary-complete'),
      copyButton: document.querySelector('#boundary-copy'),
      guide: document.querySelector('#boundary-guide'),
      result: document.querySelector('#geojson-result'),
      output: document.querySelector('#geojson-output'),
    }
  : null

function setResultMessage(message, details = []) {
  const content = document.createDocumentFragment()
  const status = document.createElement('span')
  status.className = 'result-status'
  status.textContent = message
  content.append(status)

  details.forEach(({ label, value }) => {
    if (!value) return

    const line = document.createElement('span')
    line.className = 'result-detail'

    const labelElement = document.createElement('strong')
    labelElement.textContent = label

    const valueElement = document.createElement('span')
    valueElement.textContent = value

    line.append(labelElement, valueElement)
    content.append(line)
  })

  resultMessage.replaceChildren(content)
}

function findFirstValidResult(results) {
  return results.find((result) => {
    const latitude = Number(result.y)
    const longitude = Number(result.x)
    return Number.isFinite(latitude) && Number.isFinite(longitude)
  })
}

function isPointOnSegment(point, start, end) {
  const [pointX, pointY] = point
  const [startX, startY] = start
  const [endX, endY] = end
  const crossProduct =
    (pointY - startY) * (endX - startX) - (pointX - startX) * (endY - startY)

  if (Math.abs(crossProduct) > 1e-10) return false

  return (
    pointX >= Math.min(startX, endX) - 1e-10 &&
    pointX <= Math.max(startX, endX) + 1e-10 &&
    pointY >= Math.min(startY, endY) - 1e-10 &&
    pointY <= Math.max(startY, endY) + 1e-10
  )
}

function isPointInPolygon(point, polygon) {
  let isInside = false

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current]
    const previousPoint = polygon[previous]

    if (isPointOnSegment(point, previousPoint, currentPoint)) return true

    const crossesLatitude =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1]
    const intersectionLongitude =
      ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
        (previousPoint[1] - currentPoint[1]) +
      currentPoint[0]

    if (crossesLatitude && point[0] < intersectionLongitude) {
      isInside = !isInside
    }
  }

  return isInside
}

function getDistrictName(longitude, latitude) {
  const point = [longitude, latitude]
  const districts = [
    district1GeoJson,
    district2GeoJson,
    district3GeoJson,
    district6GeoJson,
    district15GeoJson,
    district17GeoJson,
  ]
  const districtNames = districts
    .filter((district) =>
      isPointInPolygon(point, district.geometry.coordinates[0]),
    )
    .sort(
      (first, second) =>
        first.properties.district - second.properties.district,
    )
    .map((district) => district.properties.name)

  return districtNames.length > 0
    ? districtNames.join(', ')
    : '아직 등록되지 않은 지구'
}

function getPolygonCenter(polygon) {
  const [originX, originY] = polygon[0]
  let signedArea = 0
  let centerX = 0
  let centerY = 0

  for (let index = 0; index < polygon.length - 1; index += 1) {
    const currentX = polygon[index][0] - originX
    const currentY = polygon[index][1] - originY
    const nextX = polygon[index + 1][0] - originX
    const nextY = polygon[index + 1][1] - originY
    const crossProduct = currentX * nextY - nextX * currentY

    signedArea += crossProduct
    centerX += (currentX + nextX) * crossProduct
    centerY += (currentY + nextY) * crossProduct
  }

  signedArea *= 0.5

  if (Math.abs(signedArea) < Number.EPSILON) {
    return polygon[0]
  }

  const center = [
    originX + centerX / (6 * signedArea),
    originY + centerY / (6 * signedArea),
  ]

  if (isPointInPolygon(center, polygon)) {
    return center
  }

  const boundsCenter = [
    (Math.min(...polygon.map(([longitude]) => longitude)) +
      Math.max(...polygon.map(([longitude]) => longitude))) /
      2,
    (Math.min(...polygon.map(([, latitude]) => latitude)) +
      Math.max(...polygon.map(([, latitude]) => latitude))) /
      2,
  ]

  return isPointInPolygon(boundsCenter, polygon) ? boundsCenter : polygon[0]
}

function showSearchResult(result, type) {
  const kakao = window.kakao
  const latitude = Number(result.y)
  const longitude = Number(result.x)
  const position = new kakao.maps.LatLng(latitude, longitude)
  const districtName = getDistrictName(longitude, latitude)

  map.setCenter(position)
  marker.setPosition(position)
  marker.setMap(map)

  if (type === 'address') {
    const roadAddress = result.road_address?.address_name
    const lotAddress = result.address?.address_name
    const primaryAddress = roadAddress || lotAddress

    setResultMessage('검색한 위치를 지도에 표시했습니다.', [
      { label: roadAddress ? '도로명 주소' : '지번 주소', value: primaryAddress },
      {
        label: '지번 주소',
        value: roadAddress && lotAddress !== roadAddress ? lotAddress : '',
      },
      { label: '지구 안내', value: districtName },
    ])
    return
  }

  setResultMessage('검색한 장소를 지도에 표시했습니다.', [
    { label: '장소명', value: result.place_name },
    {
      label: result.road_address_name ? '도로명 주소' : '지번 주소',
      value: result.road_address_name || result.address_name,
    },
    {
      label: '지번 주소',
      value:
        result.road_address_name && result.address_name !== result.road_address_name
          ? result.address_name
          : '',
    },
    { label: '지구 안내', value: districtName },
  ])
}

function searchByKeyword(query, sequence) {
  places.keywordSearch(query, (results, status) => {
    if (sequence !== searchSequence) return

    searchButton.disabled = false
    const validResult = findFirstValidResult(results || [])

    if (status === window.kakao.maps.services.Status.OK && validResult) {
      showSearchResult(validResult, 'place')
      return
    }

    if (
      status === window.kakao.maps.services.Status.ZERO_RESULT ||
      (status === window.kakao.maps.services.Status.OK && !validResult)
    ) {
      setResultMessage('검색 결과가 없습니다. 다른 주소나 건물명을 입력해 주세요.')
      return
    }

    setResultMessage('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  })
}

function searchLocation(query) {
  const sequence = ++searchSequence
  searchButton.disabled = true
  setResultMessage('검색 중입니다.')

  geocoder.addressSearch(query, (results, status) => {
    if (sequence !== searchSequence) return

    const validResult = findFirstValidResult(results || [])

    if (status === window.kakao.maps.services.Status.OK && validResult) {
      searchButton.disabled = false
      showSearchResult(validResult, 'address')
      return
    }

    if (
      status === window.kakao.maps.services.Status.ZERO_RESULT ||
      (status === window.kakao.maps.services.Status.OK && !validResult)
    ) {
      searchByKeyword(query, sequence)
      return
    }

    searchButton.disabled = false
    setResultMessage('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  })
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const query = addressInput.value.trim()

  if (!query) {
    searchSequence += 1
    searchButton.disabled = false
    setResultMessage('주소나 건물명을 입력해 주세요.')
    addressInput.focus()
    return
  }

  if (!map || !geocoder || !places) {
    searchSequence += 1
    searchButton.disabled = false
    setResultMessage('지도가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.')
    return
  }

  searchLocation(query)
})

function setBoundaryGuide(message) {
  if (boundaryTool) boundaryTool.guide.textContent = message
}

function updateBoundaryPreview() {
  if (!boundaryTool) return

  boundaryPolyline?.setPath(boundaryCoordinates)
  boundaryPolygon?.setPath(boundaryCoordinates.length >= 3 ? boundaryCoordinates : [])
  boundaryTool.undoButton.disabled = boundaryCoordinates.length === 0
  boundaryTool.resetButton.disabled = boundaryCoordinates.length === 0
  boundaryTool.completeButton.disabled = boundaryCoordinates.length < 3
}

function addBoundaryVertex(position) {
  const vertex = document.createElement('span')
  vertex.className = 'boundary-vertex-marker'
  vertex.setAttribute('aria-hidden', 'true')

  const overlay = new window.kakao.maps.CustomOverlay({
    map,
    position,
    content: vertex,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 4,
  })

  boundaryMarkers.push(overlay)
}

function createBoundaryGeoJson() {
  const coordinates = boundaryCoordinates.map((position) => [
    position.getLng(),
    position.getLat(),
  ])

  coordinates.push([...coordinates[0]])

  return {
    type: 'Feature',
    properties: {
      district: 17,
      name: '17지구',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  }
}

function handleBoundaryMapClick(mouseEvent) {
  if (!boundaryTool || !boundaryDrawingActive || boundaryComplete) return

  boundaryCoordinates.push(mouseEvent.latLng)
  addBoundaryVertex(mouseEvent.latLng)
  updateBoundaryPreview()
  setBoundaryGuide(
    `${boundaryCoordinates.length}개의 꼭짓점을 추가했습니다. 계속 지도를 클릭하거나 경계를 완성하세요.`,
  )
}

function setupBoundaryTool(kakao) {
  if (!boundaryTool) return

  boundaryPolyline = new kakao.maps.Polyline({
    map,
    path: [],
    strokeWeight: 3,
    strokeColor: '#38bdf8',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
  })

  boundaryPolygon = new kakao.maps.Polygon({
    map,
    path: [],
    strokeWeight: 3,
    strokeColor: '#38bdf8',
    strokeOpacity: 0.95,
    fillColor: '#7dd3fc',
    fillOpacity: 0.28,
  })

  kakao.maps.event.addListener(map, 'click', handleBoundaryMapClick)
  updateBoundaryPreview()

  boundaryTool.startButton.addEventListener('click', () => {
    if (boundaryComplete) {
      setBoundaryGuide('새 경계를 그리려면 먼저 전체 초기화를 눌러 주세요.')
      return
    }

    boundaryDrawingActive = true
    boundaryTool.startButton.classList.add('is-active')
    boundaryTool.startButton.textContent = '지도에서 꼭짓점 선택 중'
    setBoundaryGuide('지도에서 17지구 경계의 꼭짓점을 차례대로 선택하세요.')
  })

  boundaryTool.undoButton.addEventListener('click', () => {
    if (boundaryCoordinates.length === 0) return

    boundaryComplete = false
    boundaryDrawingActive = true
    boundaryCoordinates.pop()
    boundaryMarkers.pop()?.setMap(null)
    boundaryTool.result.hidden = true
    boundaryTool.startButton.classList.add('is-active')
    boundaryTool.startButton.textContent = '지도에서 꼭짓점 선택 중'
    updateBoundaryPreview()
    setBoundaryGuide(`마지막 점을 취소했습니다. 현재 꼭짓점은 ${boundaryCoordinates.length}개입니다.`)
  })

  boundaryTool.resetButton.addEventListener('click', () => {
    boundaryMarkers.forEach((overlay) => overlay.setMap(null))
    boundaryMarkers = []
    boundaryCoordinates = []
    boundaryDrawingActive = false
    boundaryComplete = false
    boundaryTool.result.hidden = true
    boundaryTool.output.textContent = ''
    boundaryTool.startButton.classList.remove('is-active')
    boundaryTool.startButton.textContent = '17지구 경계 그리기'
    updateBoundaryPreview()
    setBoundaryGuide('초기화했습니다. 경계 그리기 버튼을 눌러 다시 시작하세요.')
  })

  boundaryTool.completeButton.addEventListener('click', () => {
    if (boundaryCoordinates.length < 3) {
      setBoundaryGuide('경계를 완성하려면 꼭짓점이 3개 이상 필요합니다.')
      return
    }

    boundaryDrawingActive = false
    boundaryComplete = true
    boundaryTool.startButton.classList.remove('is-active')
    boundaryTool.startButton.textContent = '17지구 경계 그리기'
    boundaryPolyline.setPath([])
    boundaryPolygon.setPath(boundaryCoordinates)
    boundaryTool.output.textContent = JSON.stringify(createBoundaryGeoJson(), null, 2)
    boundaryTool.result.hidden = false
    setBoundaryGuide('17지구 경계를 완성했습니다. 아래에서 GeoJSON 좌표를 확인하세요.')
  })

  boundaryTool.copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(boundaryTool.output.textContent)
      boundaryTool.copyButton.textContent = '복사 완료'
      window.setTimeout(() => {
        boundaryTool.copyButton.textContent = '좌표 복사'
      }, 1600)
    } catch {
      setBoundaryGuide('좌표를 복사하지 못했습니다. 직접 선택해 복사해 주세요.')
    }
  })
}

function displayDistrictBoundary(kakao) {
  const districtBoundary = district1GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#38bdf8',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#7dd3fc',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district1GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function displayDistrict2Boundary(kakao) {
  const districtBoundary = district2GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#f97316',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#fdba74',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district2GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function displayDistrict3Boundary(kakao) {
  const districtBoundary = district3GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#a855f7',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#c084fc',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district3GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function displayDistrict6Boundary(kakao) {
  const districtBoundary = district6GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#e11d48',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#fb7185',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district6GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function displayDistrict15Boundary(kakao) {
  const districtBoundary = district15GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#10b981',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#6ee7b7',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district15GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function displayDistrict17Boundary(kakao) {
  const districtBoundary = district17GeoJson.geometry.coordinates[0]
  const boundaryPath = districtBoundary.map(
    ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
  )

  new kakao.maps.Polygon({
    map,
    path: boundaryPath,
    strokeWeight: 3,
    strokeColor: '#ca8a04',
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    fillColor: '#fde047',
    fillOpacity: 0.28,
  })

  const [labelLongitude, labelLatitude] = getPolygonCenter(districtBoundary)
  const label = document.createElement('div')
  label.className = 'district-map-label'
  label.textContent = district17GeoJson.properties.name

  new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(labelLatitude, labelLongitude),
    content: label,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 3,
  })
}

function showMapError(message) {
  mapContainer.classList.add('map-container--error')
  mapStatus.innerHTML = `
    <div class="map-error-icon" aria-hidden="true">!</div>
    <p>${message}</p>
  `
}

function createKakaoMap() {
  const { kakao } = window

  if (!kakao?.maps) {
    showMapError('지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    return
  }

  kakao.maps.load(() => {
    try {
      const sindorimStation = new kakao.maps.LatLng(37.5088, 126.8913)
      map = new kakao.maps.Map(mapContainer, {
        center: sindorimStation,
        level: 4,
      })

      marker = new kakao.maps.Marker({
        map,
        position: sindorimStation,
        title: '신도림역',
      })
      geocoder = new kakao.maps.services.Geocoder()
      places = new kakao.maps.services.Places()
      displayDistrictBoundary(kakao)
      displayDistrict2Boundary(kakao)
      displayDistrict3Boundary(kakao)
      displayDistrict6Boundary(kakao)
      displayDistrict15Boundary(kakao)
      displayDistrict17Boundary(kakao)
      setupBoundaryTool(kakao)

      mapStatus.remove()
    } catch {
      showMapError('지도를 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  })
}

function loadKakaoMaps() {
  if (!kakaoJavaScriptKey) {
    showMapError('지도 설정 키가 없습니다. 환경 설정을 확인해 주세요.')
    return
  }

  const script = document.createElement('script')
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoJavaScriptKey)}&autoload=false&libraries=services`
  script.async = true
  script.addEventListener('load', createKakaoMap, { once: true })
  script.addEventListener(
    'error',
    () => {
      showMapError('지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    },
    { once: true },
  )
  document.head.append(script)
}

loadKakaoMaps()
