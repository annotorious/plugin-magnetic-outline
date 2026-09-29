# Whitelist of OpenCV functions exported to JavaScript. Same format as
# opencv/platforms/js/opencv_js.config.py. When adding a function, also add it
# to vendor/opencv/opencv.d.ts and to the API list in smoke-test.mjs.

core = {
    '': [],   # Mat, Point, exceptionFromPtr etc. come from core_bindings.cpp
}

imgproc = {
    '': ['cvtColor', 'goodFeaturesToTrack'],
    'segmentation_IntelligentScissorsMB': [
        'IntelligentScissorsMB',
        'setEdgeFeatureCannyParameters',
        'setGradientMagnitudeMaxLimit',
        'applyImage',
        'buildMap',
        'getContour',
    ],
}

white_list = makeWhiteList([core, imgproc])
