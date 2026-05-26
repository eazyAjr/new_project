import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    AMap: any
  }
}

interface PoiItem {
  id: string
  name: string
  address: string
  location: [number, number]
}

interface RouteStep {
  instruction: string
  distance: number
  time: number
}

type NavMode = 'driving' | 'walking' | 'transit'

const MODE_NAMES: Record<NavMode, string> = {
  driving: '驾车',
  walking: '步行',
  transit: '公交/地铁',
}

const MODE_COLORS: Record<NavMode, string> = {
  driving: '#1890ff',
  walking: '#52c41a',
  transit: '#fa8c16',
}

export default function RoutePlanner() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const routeRef = useRef<any>(null)
  const startMarkerRef = useRef<any>(null)
  const endMarkerRef = useRef<any>(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<PoiItem[]>([])
  const [showResults, setShowResults] = useState(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [targetLocation, setTargetLocation] = useState<[number, number] | null>(null)

  const [navMode, setNavMode] = useState<NavMode>('driving')
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 输入防抖搜索
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    searchTimerRef.current = setTimeout(() => {
      handleSearch(trimmed)
    }, 400)
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [searchInput])

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    if (!window.AMap) {
      setError('高德地图 SDK 未加载')
      return
    }

    try {
      mapInstance.current = new window.AMap.Map(mapRef.current, {
        zoom: 14,
        center: [116.397428, 39.90923],
      })

      window.AMap.plugin(['AMap.ToolBar'], () => {
        mapInstance.current.addControl(new window.AMap.ToolBar())
      })

      // 页面打开自动定位
      autoLocate()
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

  const autoLocate = () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持地理定位')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude
        const lat = position.coords.latitude
        setUserLocation([lng, lat])
        setLoading(false)

        mapInstance.current.setCenter([lng, lat])
        mapInstance.current.setZoom(15)

        if (startMarkerRef.current) {
          startMarkerRef.current.setMap(null)
        }
        startMarkerRef.current = new window.AMap.Marker({
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
      },
      (err) => {
        setLoading(false)
        setError('获取位置失败: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // 模糊搜索地点
  const handleSearch = (keyword?: string) => {
    const kw = (keyword ?? searchInput).trim()
    if (!kw) return
    if (!window.AMap) {
      setError('高德地图 SDK 未加载')
      return
    }

    setLoading(true)
    setError('')

    window.AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new window.AMap.PlaceSearch({
        pageSize: 10,
        pageIndex: 1,
        extensions: 'all',
      })

      placeSearch.search(kw, (status: string, result: any) => {
        setLoading(false)
        if (status === 'complete' && result.info === 'OK' && result.poiList?.pois) {
          const pois = result.poiList.pois
          const items: PoiItem[] = pois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || '暂无地址',
            location: [poi.location.lng, poi.location.lat],
          }))
          setSearchResults(items)
          setShowResults(true)
        } else {
          setSearchResults([])
          setShowResults(true)
          setError('未搜索到相关地点')
        }
      })
    })
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchResults([])
    setShowResults(false)
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
  }

  // 点击搜索结果
  const selectPoi = (poi: PoiItem) => {
    setSearchInput(poi.name)
    setTargetLocation(poi.location)
    setShowResults(false)
    setRouteInfo(null)
    setRouteSteps([])

    // 清除之前的目标标记
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null)
    }

    // 定位到目标位置
    mapInstance.current.setCenter(poi.location)
    mapInstance.current.setZoom(15)

    endMarkerRef.current = new window.AMap.Marker({
      position: poi.location,
      map: mapInstance.current,
      title: poi.name,
      label: { content: poi.name, offset: new window.AMap.Pixel(0, -35) },
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(32, 32),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        imageSize: new window.AMap.Size(32, 32),
      }),
      offset: new window.AMap.Pixel(-16, -32),
    })
  }

  // 导航
  const doNavigate = (mode: NavMode) => {
    if (!userLocation || !targetLocation) {
      setError('请先定位当前位置并选择目标地点')
      return
    }

    setNavMode(mode)
    setLoading(true)
    setError('')
    setRouteInfo(null)
    setRouteSteps([])

    // 清除之前的路线
    if (routeRef.current) {
      if (routeRef.current.clear) routeRef.current.clear()
      routeRef.current = null
    }

    const start = new window.AMap.LngLat(userLocation[0], userLocation[1])
    const end = new window.AMap.LngLat(targetLocation[0], targetLocation[1])

    if (mode === 'driving') {
      window.AMap.plugin(['AMap.Driving'], () => {
        const driving = new window.AMap.Driving({
          map: mapInstance.current,
          policy: window.AMap.DrivingPolicy.LEAST_TIME,
          hideMarkers: true,
          panel: false,
        })
        routeRef.current = driving

        driving.search(start, end, (status: string, result: any) => {
          setLoading(false)
          if (status === 'complete' && result.info === 'OK' && result.routes?.[0]) {
            const route = result.routes[0]
            setRouteInfo(route)
            setRouteSteps(
              route.steps.map((s: any) => ({
                instruction: s.instruction,
                distance: s.distance,
                time: s.time,
              }))
            )
            // 调整视野
            mapInstance.current.setFitView()
          } else {
            setError('驾车导航路线计算失败')
          }
        })
      })
    } else if (mode === 'walking') {
      window.AMap.plugin(['AMap.Walking'], () => {
        const walking = new window.AMap.Walking({
          map: mapInstance.current,
          hideMarkers: true,
          panel: false,
        })
        routeRef.current = walking

        walking.search(start, end, (status: string, result: any) => {
          setLoading(false)
          if (status === 'complete' && result.info === 'OK' && result.routes?.[0]) {
            const route = result.routes[0]
            setRouteInfo(route)
            setRouteSteps(
              route.steps.map((s: any) => ({
                instruction: s.instruction,
                distance: s.distance,
                time: s.time,
              }))
            )
            mapInstance.current.setFitView()
          } else {
            setError('步行导航路线计算失败')
          }
        })
      })
    } else if (mode === 'transit') {
      window.AMap.plugin(['AMap.Transfer'], () => {
        const transfer = new window.AMap.Transfer({
          map: mapInstance.current,
          policy: window.AMap.TransferPolicy.LEAST_TIME,
          hideMarkers: true,
          panel: false,
          city: '北京',
        })
        routeRef.current = transfer

        transfer.search(start, end, (status: string, result: any) => {
          setLoading(false)
          if (status === 'complete' && result.info === 'OK' && result.plans?.[0]) {
            const plan = result.plans[0]
            setRouteInfo({
              distance: plan.distance,
              time: plan.time,
              steps: plan.segments,
            })
            setRouteSteps(
              plan.segments.map((s: any) => {
                const type = s.transit_mode === 'BUS' || s.transit_mode === 'SUBWAY' ? '乘车' : '步行'
                return {
                  instruction: `${type}: ${s.instruction || s.transit?.lines?.[0]?.name || ''}`,
                  distance: s.distance,
                  time: s.time,
                }
              })
            )
            mapInstance.current.setFitView()
          } else {
            setError('公交/地铁路线计算失败，可能是该城市暂不支持')
          }
        })
      })
    }
  }

  return (
    <div style={styles.page}>
      {/* 搜索栏 */}
      <div style={styles.searchBar}>
        <div style={styles.searchRow}>
          <div style={styles.inputWrap}>
            <input
              style={styles.searchInput}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索地点..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchInput && (
              <button
                type="button"
                style={styles.clearBtn}
                onClick={clearSearch}
                aria-label="清除"
              >
                ×
              </button>
            )}
          </div>
          <button style={styles.searchBtn} onClick={() => handleSearch()} disabled={loading}>
            搜索
          </button>
          <button style={styles.locateBtn} onClick={autoLocate} disabled={loading}>
            定位
          </button>
        </div>
        {showResults && (
          <div style={styles.resultList}>
            {searchResults.length > 0 ? (
              searchResults.map((poi) => (
                <div key={poi.id} style={styles.resultItem} onClick={() => selectPoi(poi)}>
                  <div style={styles.resultName}>{poi.name}</div>
                  <div style={styles.resultAddr}>{poi.address}</div>
                </div>
              ))
            ) : (
              <div style={styles.resultEmpty}>暂无结果</div>
            )}
          </div>
        )}
      </div>

      {/* 模式切换 + 导航按钮 */}
      {targetLocation && (
        <div style={styles.navBar}>
          <div style={styles.modeTabs}>
            {(['driving', 'walking', 'transit'] as NavMode[]).map((mode) => (
              <button
                key={mode}
                style={{
                  ...styles.modeBtn,
                  ...(navMode === mode ? { ...styles.modeBtnActive, borderColor: MODE_COLORS[mode], color: MODE_COLORS[mode] } : {}),
                }}
                onClick={() => doNavigate(mode)}
              >
                {MODE_NAMES[mode]}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div style={styles.errorMsg}>{error}</div>}

      {/* 地图 */}
      <div style={styles.mapWrap}>
        <div ref={mapRef} style={styles.map} />

        {/* 右侧路线详情 */}
        {routeInfo && (
          <div style={styles.routePanel}>
            <h3 style={styles.panelTitle}>
              {MODE_NAMES[navMode]}路线详情
            </h3>
            <div style={styles.routeSummary}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>总距离</span>
                <span style={styles.summaryValue}>
                  {navMode === 'transit'
                    ? `${(routeInfo.distance / 1000).toFixed(2)} km`
                    : `${(routeInfo.distance / 1000).toFixed(2)} km`}
                </span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>预计时间</span>
                <span style={styles.summaryValue}>{Math.ceil(routeInfo.time / 60)} 分钟</span>
              </div>
            </div>
            <div style={styles.stepsList}>
              {routeSteps.map((step, index) => (
                <div key={index} style={styles.stepItem}>
                  <span
                    style={{
                      ...styles.stepIndex,
                      backgroundColor: MODE_COLORS[navMode],
                    }}
                  >
                    {index + 1}
                  </span>
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
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    gap: 12,
  },
  searchBar: {
    position: 'relative',
    flexShrink: 0,
    zIndex: 10,
  },
  searchRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  inputWrap: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '10px 32px 10px 14px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #d9d9d9',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#ccc',
    color: '#fff',
    fontSize: 14,
    lineHeight: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  searchBtn: {
    padding: '10px 20px',
    fontSize: 14,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#1890ff',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  locateBtn: {
    padding: '10px 16px',
    fontSize: 14,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#52c41a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  resultList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    border: '1px solid #e8e8e8',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxHeight: 280,
    overflow: 'auto',
    zIndex: 20,
  },
  resultItem: {
    padding: '10px 14px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  resultName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  resultAddr: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resultEmpty: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  modeTabs: {
    display: 'flex',
    gap: 8,
  },
  modeBtn: {
    padding: '8px 20px',
    fontSize: 14,
    borderRadius: 20,
    border: '1px solid #d9d9d9',
    backgroundColor: '#fff',
    color: '#666',
    cursor: 'pointer',
    fontWeight: 500,
  },
  modeBtnActive: {
    backgroundColor: '#f0f5ff',
    fontWeight: 600,
  },
  errorMsg: {
    color: '#ff4d4f',
    fontSize: 13,
    flexShrink: 0,
  },
  mapWrap: {
    display: 'flex',
    flex: 1,
    gap: 16,
    minHeight: 0,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    borderRadius: 8,
    border: '1px solid #e8e8e8',
    minWidth: 0,
  },
  routePanel: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e8e8e8',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  panelTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  routeSummary: {
    display: 'flex',
    gap: 16,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottom: '1px solid #f0f0f0',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  stepsList: {
    flex: 1,
    overflow: 'auto',
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
    width: 22,
    height: 22,
    borderRadius: '50%',
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
