import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    AMap: any
  }
}

interface BankInfo {
  name: string
  address: string
  distance: string
  location: [number, number]
  tel?: string
}

export default function BankLocator() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const drivingRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const bankMarkersRef = useRef<any[]>([])
  const [banks, setBanks] = useState<BankInfo[]>([])
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [cityInput, setCityInput] = useState('北京市')

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    if (!window.AMap) {
      setError('高德地图 SDK 未加载，请刷新页面')
      return
    }

    try {
      mapInstance.current = new window.AMap.Map(mapRef.current, {
        zoom: 12,
        center: [116.397428, 39.90923],
      })

      window.AMap.plugin(['AMap.ToolBar'], () => {
        mapInstance.current.addControl(new window.AMap.ToolBar())
      })
    } catch (e: any) {
      setError('地图初始化失败: ' + (e?.message || '未知错误'))
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
    }
  }, [])

  const handleSearch = () => {
    if (!window.AMap) {
      setError('高德地图 SDK 未加载')
      return
    }
    if (!navigator.geolocation) {
      setError('浏览器不支持地理定位，请使用城市搜索')
      return
    }

    setLoading(true)
    setError('')
    setDebug('正在获取位置...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude
        const lat = position.coords.latitude
        setDebug(`位置获取成功: ${lng.toFixed(4)}, ${lat.toFixed(4)}`)
        setUserLocation([lng, lat])

        mapInstance.current.clearMap()
        mapInstance.current.setCenter([lng, lat])
        mapInstance.current.setZoom(13)

        userMarkerRef.current = new window.AMap.Marker({
          position: [lng, lat],
          map: mapInstance.current,
          title: '我的位置',
          label: { content: '我的位置', offset: new window.AMap.Pixel(0, -35) },
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(36, 36),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            imageSize: new window.AMap.Size(36, 36),
          }),
          offset: new window.AMap.Pixel(-18, -36),
        })

        searchNearbyBanks(lng, lat)
      },
      (err) => {
        setLoading(false)
        const msg = '获取位置失败: ' + err.message + ' (尝试使用城市搜索)'
        setError(msg)
        setDebug(msg)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSearchByCity = () => {
    if (!window.AMap) {
      setError('高德地图 SDK 未加载')
      return
    }
    if (!cityInput.trim()) {
      setError('请输入城市名称')
      return
    }

    setLoading(true)
    setError('')
    setDebug(`正在搜索城市: ${cityInput}`)

    window.AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], () => {
      const geocoder = new window.AMap.Geocoder()
      geocoder.getLocation(cityInput, (status: string, result: any) => {
        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
          const loc = result.geocodes[0].location
          const lng = loc.lng
          const lat = loc.lat
          setUserLocation([lng, lat])
          setDebug(`城市定位成功: ${cityInput} -> ${lng.toFixed(4)}, ${lat.toFixed(4)}`)

          mapInstance.current.clearMap()
          mapInstance.current.setCenter([lng, lat])
          mapInstance.current.setZoom(12)

          new window.AMap.Marker({
            position: [lng, lat],
            map: mapInstance.current,
            title: cityInput,
            label: { content: cityInput, offset: new window.AMap.Pixel(0, -30) },
          })

          searchNearbyBanks(lng, lat)
        } else {
          setLoading(false)
          setError('城市定位失败，请检查城市名称')
          setDebug(`城市定位失败: ${status}, ${JSON.stringify(result)}`)
        }
      })
    })
  }

  const searchNearbyBanks = (lng: number, lat: number) => {
    setDebug((prev) => prev + `\n开始搜索银行, 中心: ${lng.toFixed(4)},${lat.toFixed(4)}, 半径5km...`)

    window.AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new window.AMap.PlaceSearch({
        pageSize: 30,
        pageIndex: 1,
        extensions: 'all',
      })

      // 方式1: 使用 searchNearBy (关键词, 中心点, 半径)
      placeSearch.searchNearBy('银行', [lng, lat], 5000, (status: string, result: any) => {
        setLoading(false)
        setDebug((prev) => prev + `\n[searchNearBy] status=${status}`)

        // 详细打印返回结果结构
        try {
          setDebug((prev) => prev + `\n[searchNearBy] result类型=${typeof result}, 有info=${!!result?.info}, info=${result?.info}`)
          if (result && result.poiList) {
            setDebug((prev) => prev + `\n[searchNearBy] poiList存在, count=${result.poiList.count || '?'}`)
          } else if (result && Array.isArray(result.poiList)) {
            setDebug((prev) => prev + `\n[searchNearBy] poiList是数组, length=${result.poiList.length}`)
          } else {
            setDebug((prev) => prev + `\n[searchNearBy] result结构=${JSON.stringify(result).substring(0, 200)}`)
          }
        } catch (e) {
          setDebug((prev) => prev + `\n[searchNearBy] 打印result出错`)
        }

        let pois: any[] = []

        if (status === 'complete' && result && result.info === 'OK') {
          if (result.poiList && result.poiList.pois) {
            pois = result.poiList.pois
          } else if (result.poiList && Array.isArray(result.poiList)) {
            pois = result.poiList
          }
        }

        setDebug((prev) => prev + `\n[searchNearBy] 解析到 ${pois.length} 个POI`)

        if (pois.length > 0) {
          renderBanks(pois, lng, lat)
          return
        }

        // 方式2: 降级使用 search 方法按城市搜索
        setDebug((prev) => prev + `\n[searchNearBy] 无结果, 降级使用 citySearch...`)
        fallbackCitySearch(placeSearch, lng, lat)
      })
    })
  }

  const fallbackCitySearch = (placeSearch: any, lng: number, lat: number) => {
    // 获取当前城市名再搜索
    window.AMap.plugin(['AMap.Geocoder'], () => {
      const geocoder = new window.AMap.Geocoder({ radius: 1000 })
      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        let city = '全国'
        if (status === 'complete' && result.regeocode) {
          city = result.regeocode.addressComponent.city || result.regeocode.addressComponent.province
        }

        setDebug((prev) => prev + `\n[fallback] 识别城市: ${city}`)
        placeSearch.search('银行', city, (status2: string, result2: any) => {
          setDebug((prev) => prev + `\n[fallback search] status=${status2}, info=${result2?.info}`)

          let pois: any[] = []
          if (status2 === 'complete' && result2 && result2.info === 'OK') {
            if (result2.poiList && result2.poiList.pois) {
              pois = result2.poiList.pois
            }
          }

          if (pois.length > 0) {
            renderBanks(pois, lng, lat)
          } else {
            setError(`在「${city}」附近未找到银行，请尝试城市搜索功能`)
            setDebug((prev) => prev + `\n[fallback] 也未找到结果`)
          }
        })
      })
    })
  }

  const renderBanks = (pois: any[], userLng: number, userLat: number) => {
    const bankList: BankInfo[] = pois.map((poi: any) => ({
      name: poi.name,
      address: poi.address || '暂无地址',
      distance: poi.distance ? `${(poi.distance / 1000).toFixed(2)} km` : '未知',
      location: [poi.location?.lng || userLng, poi.location?.lat || userLat],
      tel: poi.tel || '-',
    }))
    setBanks(bankList)
    setDebug((prev) => prev + `\n[render] 渲染 ${bankList.length} 家银行`)

      bankMarkersRef.current = []
    pois.forEach((poi: any, index: number) => {
      if (!poi.location) return
      const marker = new window.AMap.Marker({
        position: [poi.location.lng, poi.location.lat],
        map: mapInstance.current,
        title: poi.name,
        label: {
          content: `<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:50%;font-size:12px;font-weight:bold;">${index + 1}</span>`,
          offset: new window.AMap.Pixel(0, -28),
        },
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(28, 28),
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          imageSize: new window.AMap.Size(28, 28),
        }),
        offset: new window.AMap.Pixel(-14, -28),
      })
      marker.on('click', () => {
        const bank = bankList[index]
        if (bank) selectBank(bank)
      })
      bankMarkersRef.current.push({ marker, index })
    })

    if (bankList.length > 0) {
      selectBank(bankList[0])
    }
  }

  const selectBank = (bank: BankInfo) => {
    setSelectedBank(bank)
    setRouteInfo(null)

    if (!userLocation) return

    // 隐藏所有银行标记，只保留选中的
    const selectedIndex = banks.findIndex((b) => b.name === bank.name)
    bankMarkersRef.current.forEach((item: any) => {
      if (item.index !== selectedIndex) {
        item.marker.hide()
      } else {
        item.marker.show()
      }
    })

    window.AMap.plugin(['AMap.Driving'], () => {
      // 清除之前的路线
      if (drivingRef.current) {
        drivingRef.current.clear()
      }

      const driving = new window.AMap.Driving({
        map: mapInstance.current,
        policy: window.AMap.DrivingPolicy.LEAST_TIME,
        hideMarkers: false,
      })
      drivingRef.current = driving

      driving.search(
        new window.AMap.LngLat(userLocation[0], userLocation[1]),
        new window.AMap.LngLat(bank.location[0], bank.location[1]),
        (status: string, result: any) => {
          if (status === 'complete' && result.info === 'OK' && result.routes && result.routes[0]) {
            setRouteInfo(result.routes[0])
          } else {
            setRouteInfo(null)
          }
        }
      )
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button style={styles.searchBtn} onClick={handleSearch} disabled={loading}>
          {loading ? '查找中...' : '查找附近银行'}
        </button>
        <span style={styles.divider}>|</span>
        <input
          style={styles.cityInput}
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="输入城市名称"
          onKeyDown={(e) => e.key === 'Enter' && handleSearchByCity()}
        />
        <button style={styles.searchBtn2} onClick={handleSearchByCity} disabled={loading}>
          城市搜索
        </button>
        {error && <span style={styles.error}>{error}</span>}
      </div>
      {debug && (
        <div style={styles.debugPanel}>
          <pre style={styles.debugText}>{debug}</pre>
        </div>
      )}

      <div style={styles.mapSection}>
        <div ref={mapRef} style={styles.map} />

        <div style={styles.sidebarPanel}>
          {banks.length > 0 && (
            <div style={styles.bankList}>
              <h3 style={styles.panelTitle}>附近银行</h3>
              {banks.map((bank, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.bankItem,
                    ...(selectedBank?.name === bank.name ? styles.bankItemActive : {}),
                  }}
                  onClick={() => selectBank(bank)}
                >
                  <div style={styles.bankName}>
                    <span style={styles.bankIndex}>{index + 1}</span>
                    {bank.name}
                  </div>
                  <div style={styles.bankMeta}>地址：{bank.address}</div>
                  <div style={styles.bankMeta}>距离：{bank.distance}</div>
                </div>
              ))}
            </div>
          )}

          {selectedBank && (
            <div style={styles.routePanel}>
              <h3 style={styles.panelTitle}>导航详情</h3>
              <div style={styles.routeInfo}>
                <div style={styles.routeRow}>
                  <span style={styles.routeLabel}>目标银行</span>
                  <span style={styles.routeValue}>{selectedBank.name}</span>
                </div>
                <div style={styles.routeRow}>
                  <span style={styles.routeLabel}>地址</span>
                  <span style={styles.routeValue}>{selectedBank.address}</span>
                </div>
                <div style={styles.routeRow}>
                  <span style={styles.routeLabel}>电话</span>
                  <span style={styles.routeValue}>{selectedBank.tel}</span>
                </div>
                <div style={styles.routeRow}>
                  <span style={styles.routeLabel}>直线距离</span>
                  <span style={styles.routeValue}>{selectedBank.distance}</span>
                </div>
                {routeInfo && (
                  <>
                    <div style={styles.routeRow}>
                      <span style={styles.routeLabel}>驾车距离</span>
                      <span style={styles.routeValue}>
                        {(routeInfo.distance / 1000).toFixed(2)} km
                      </span>
                    </div>
                    <div style={styles.routeRow}>
                      <span style={styles.routeLabel}>预计时间</span>
                      <span style={styles.routeValue}>
                        {Math.ceil(routeInfo.time / 60)} 分钟
                      </span>
                    </div>
                  </>
                )}
              </div>

              {routeInfo && routeInfo.steps && routeInfo.steps.length > 0 && (
                <div style={styles.stepsPanel}>
                  <h4 style={styles.stepsTitle}>路线指引</h4>
                  <div style={styles.stepsList}>
                    {routeInfo.steps.map((step: any, index: number) => (
                      <div key={index} style={styles.stepItem}>
                        <span style={styles.stepIndex}>{index + 1}</span>
                        <div style={styles.stepContent}>
                          <div dangerouslySetInnerHTML={{ __html: step.instruction }} />
                          <div style={styles.stepMeta}>
                            {step.distance} 米 / {Math.ceil(step.time / 60)} 分钟
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  searchBtn: {
    padding: '10px 24px',
    fontSize: 14,
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#1890ff',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  searchBtn2: {
    padding: '10px 20px',
    fontSize: 14,
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#52c41a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  cityInput: {
    padding: '9px 12px',
    fontSize: 14,
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    width: 140,
    outline: 'none',
  },
  divider: {
    color: '#d9d9d9',
    fontSize: 14,
  },
  error: {
    color: '#ff4d4f',
    fontSize: 13,
  },
  debugPanel: {
    backgroundColor: '#f6ffed',
    border: '1px solid #b7eb8f',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: '#333',
    flexShrink: 0,
    maxHeight: 100,
    overflow: 'auto',
  },
  debugText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  mapSection: {
    display: 'flex',
    flex: 1,
    gap: 16,
    minHeight: 0,
  },
  map: {
    flex: 1,
    borderRadius: 8,
    border: '1px solid #e8e8e8',
    minWidth: 0,
  },
  sidebarPanel: {
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  bankList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #e8e8e8',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
  },
  panelTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  bankItem: {
    padding: '12px',
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid transparent',
    marginBottom: 8,
    transition: 'all 0.2s',
  },
  bankItemActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  bankName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  bankIndex: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#1890ff',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bankMeta: {
    fontSize: 12,
    color: '#666',
    lineHeight: '20px',
  },
  routePanel: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #e8e8e8',
    flexShrink: 0,
    maxHeight: 280,
    overflow: 'auto',
  },
  routeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  routeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    lineHeight: '20px',
  },
  routeLabel: {
    color: '#666',
  },
  routeValue: {
    color: '#333',
    fontWeight: 500,
    maxWidth: 200,
    textAlign: 'right',
  },
  stepsPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #f0f0f0',
  },
  stepsTitle: {
    margin: '0 0 12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  stepItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepIndex: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#52c41a',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    flexShrink: 0,
    marginTop: 2,
  },
  stepContent: {
    fontSize: 13,
    color: '#333',
    lineHeight: '20px',
  },
  stepMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
}
