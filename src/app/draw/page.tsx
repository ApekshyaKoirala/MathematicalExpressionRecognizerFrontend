import React from 'react'
import { useRef, useEffect, useState } from 'react'
import Instructions from '@/components/Instructions';
import CanvasArea from '@/components/CanvasArea';
export default function Drawpage() {
    return (
        <div>
            <h1>draw page</h1>
            <CanvasArea />
            <Instructions/>
        </div>
    );
}


