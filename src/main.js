import './style.css'

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

function showSearchResult(result, type) {
  const kakao = window.kakao
  const position = new kakao.maps.LatLng(Number(result.y), Number(result.x))

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
      { label: '지구 안내', value: '지구 경계 데이터 연결 준비 중' },
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
    { label: '지구 안내', value: '지구 경계 데이터 연결 준비 중' },
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
