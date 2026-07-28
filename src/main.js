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
      <div class="map-placeholder">
        <div class="map-pin" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"></path>
            <circle cx="12" cy="9" r="2.5"></circle>
          </svg>
        </div>
        <p>지도가 표시될 영역</p>
      </div>
    </section>
  </main>
`

const searchForm = document.querySelector('#search-form')
const addressInput = document.querySelector('#address')
const resultMessage = document.querySelector('#result-message')

searchForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const address = addressInput.value.trim()

  if (!address) {
    resultMessage.textContent = '주소를 입력해 주세요.'
    addressInput.focus()
    return
  }

  resultMessage.textContent = `“${address}”의 지구 정보를 확인할 준비가 되었습니다.`
})
