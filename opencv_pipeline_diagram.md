# Computer Vision Processing Flow

This diagram illustrates the sequential computer vision pipeline used to analyze examination footage, focusing heavily on motion analysis and pose extraction.

```mermaid
flowchart TD
    %% Video Input
    Video([Raw Video Footage]) --> Frame[Read Frame\ncv2.VideoCapture]
    
    %% Motion Analysis
    subgraph MotionAnalysis ["1. Motion Detection & Tracking"]
        Frame --> MOG2[MOG2 Background Subtraction\ncv2.createBackgroundSubtractorMOG2]
        MOG2 --> Mask[Foreground Mask\nIdentify moving pixels]
        
        Frame --> OptFlow[Dense Optical Flow\ncv2.calcOpticalFlowFarneback]
        Mask -.->|Mask applied to| OptFlow
        OptFlow --> MotionMap[Motion Vectors & Heatmaps\nDirection & Magnitude]
    end
    
    %% Target Isolation
    subgraph TargetIsolation ["2. Target Isolation (ROI)"]
        MotionMap --> Detect[Object/Behavior Detection\nYOLO / CVAT Sync]
        Detect --> Crop[ROI Extraction\nCrop Frame to Bounding Box]
    end
    
    %% Pose Estimation
    subgraph PoseEstimation ["3. Skeletonization"]
        Crop --> RGB[Convert to RGB\ncv2.cvtColor]
        RGB --> MPPose[MediaPipe Pose Estimation\nmp.solutions.pose]
        MPPose --> Landmarks[33 3D Skeleton Landmarks]
    end
    
    %% Outputs
    Landmarks --> Out([Behavior & Anomaly Analysis])

    %% Styling
    classDef io fill:#475569,stroke:#334155,stroke-width:2px,color:#fff;
    classDef cv fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff;
    classDef ai fill:#059669,stroke:#047857,stroke-width:2px,color:#fff;
    
    class Video,Out io;
    class Frame,MOG2,Mask,OptFlow,MotionMap,Crop,RGB cv;
    class Detect,MPPose,Landmarks ai;
```

### Flow Breakdown:
1. **MOG2 Background Subtraction:** The frame first passes through the MOG2 algorithm. It learns the static background of the examination hall (desks, walls) and produces a mask that highlights only the moving foreground elements (students, papers, phones).
2. **Optical Flow (Farneback):** Dense optical flow is calculated to understand the direction and magnitude of the motion (e.g., distinguishing between a student writing normally vs. rapidly turning their head). The MOG2 mask is often used to filter out noise, so optical flow is only calculated on moving subjects.
3. **ROI Extraction:** Before generating the skeleton, the region of interest (ROI) is isolated using a bounding box to focus the analysis strictly on the candidate, ignoring the rest of the room.
4. **MediaPipe Pose:** The cropped, RGB-converted ROI is passed to MediaPipe, which extracts the 33 skeletal landmarks. Because the image is already filtered and cropped by the earlier pipeline steps, MediaPipe runs highly efficiently and accurately on just the target.
