import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { clearCurrentTeacher, getCurrentTeacher } from '@/lib/authStorage';
import { AppHeader } from '@/src/components/common/AppHeader';
import { BackButton } from '@/src/components/common/BackButton';
import { FilterPills } from '@/src/components/common/FilterPills';
import { ScannerControls } from '@/src/components/scanner/ScannerControls';
import { StudentCard } from '@/src/components/students/StudentCard';
import { fetchClassrooms } from '@/src/data/classrooms';
import { fetchSections } from '@/src/data/sections';
import { fetchStudents } from '@/src/data/students';
import { Classroom, ListFilter, Section, Student } from '@/src/features/attendance/types';
import {
  getBackendStatus,
  recognizeAttendancePhoto,
  startAttendanceSession,
  stopAttendanceSession,
} from '@/src/features/recognition/api';

const AUTO_SCAN_INTERVAL_MS = 1000;
const DOWNLOAD_ALBUM_CANDIDATES = ['Download', 'Downloads'];
const normalizeName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const READY_MESSAGE = 'Ready to scan.';

function updateAllStudentStatuses(
  students: Student[],
  status: Student['status'],
): Student[] {
  return students.map((student) => ({ ...student, status }));
}

function findMatchedStudents(students: Student[], recognizedPeople: { roll: string; person: string }[]): Map<string, Student> {
  const matchedStudents = new Map<string, Student>();

  for (const person of recognizedPeople) {
    const byRoll = students.find((student) => student.rollNo === String(person.roll));

    if (byRoll) {
      matchedStudents.set(byRoll.rollNo, byRoll);
      continue;
    }

    const normalizedPerson = normalizeName(person.person);

    for (const student of students) {
      const studentName = normalizeName(student.name);

      if (
        studentName === normalizedPerson ||
        studentName.includes(normalizedPerson) ||
        normalizedPerson.includes(studentName)
      ) {
        matchedStudents.set(student.rollNo, student);
      }
    }
  }

  return matchedStudents;
}

export default function ClassroomsScreen() {

  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera | null>(null);
  const uploadingRef = useRef(false);
  const studentsRef = useRef<Student[]>([]);
  const recordingRef = useRef(false);
  const pendingSaveAfterRecordingRef = useRef(false);
  const cameraReadyRef = useRef(false);

  const [teacherName, setTeacherName] = useState('Teacher');

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const [filter, setFilter] = useState<ListFilter>('all');

  const [scanning, setScanning] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
  const [lastMatch, setLastMatch] = useState('Ready');
  const [uploading, setUploading] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState<string | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<number | null>(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  const total = students.length;
  const present = students.filter((s) => s.status === 'present').length;
  const absent = students.filter((s) => s.status === 'absent').length;

  const filteredStudents = filter === 'all'
    ? students
    : students.filter((s) => s.status === filter);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const session = await getCurrentTeacher();

        if (active) {
          setTeacherName(session?.fullName?.trim() || 'Teacher');
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    if (!scanning) {
      cameraReadyRef.current = false;
      setCameraReady(false);
    }
  }, [scanning]);

  useEffect(() => {
    cameraReadyRef.current = false;
    setCameraReady(false);
  }, [cameraPosition, selectedSection]);

  const saveRecordingToLibrary = useCallback(async (videoPath: string) => {
    const mediaPermission = await MediaLibrary.requestPermissionsAsync();

    if (!mediaPermission.granted) {
      throw new Error('Media permission is required to save scan recordings.');
    }

    const asset = await MediaLibrary.createAssetAsync(videoPath);

    try {
      let downloadsAlbum: MediaLibrary.Album | null = null;

      for (const albumName of DOWNLOAD_ALBUM_CANDIDATES) {
        downloadsAlbum = await MediaLibrary.getAlbumAsync(albumName);
        if (downloadsAlbum) {
          break;
        }
      }

      if (downloadsAlbum) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], downloadsAlbum, false);
      } else {
        await MediaLibrary.createAlbumAsync(DOWNLOAD_ALBUM_CANDIDATES[0], asset, false);
      }
    } catch {
      await MediaLibrary.saveToLibraryAsync(videoPath);
    }
  }, []);

  const handleRecordingFinished = useCallback(async (videoPath: string) => {
    recordingRef.current = false;
    setLastRecordingPath(videoPath);

    if (!pendingSaveAfterRecordingRef.current) {
      setLastMatch('Scan recording is ready to download.');
      return;
    }

    pendingSaveAfterRecordingRef.current = false;
    setSavingVideo(true);

    try {
      await saveRecordingToLibrary(videoPath);
      setLastMatch('Scan recording saved to your downloads.');
    } catch (error) {
      console.warn(error);
      setLastMatch(error instanceof Error ? error.message : 'Unable to save the scan recording.');
    } finally {
      setSavingVideo(false);
    }
  }, [saveRecordingToLibrary]);

  const stopRecordingIfNeeded = useCallback(async (saveAfterStop: boolean) => {
    pendingSaveAfterRecordingRef.current = saveAfterStop;

    if (!recordingRef.current || !cameraRef.current) {
      return;
    }

    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      recordingRef.current = false;
      pendingSaveAfterRecordingRef.current = false;
      console.warn(error);
      setLastMatch('Unable to stop the scan recording.');
    }
  }, []);

  const startRecordingIfNeeded = useCallback(async () => {
    if (recordingRef.current || !cameraRef.current) {
      return;
    }

    recordingRef.current = true;
    setLastRecordingPath(null);

    try {
      cameraRef.current.startRecording({
        flash: 'off',
        onRecordingFinished: (video) => {
          void handleRecordingFinished(video.path);
        },
        onRecordingError: (error) => {
          recordingRef.current = false;
          pendingSaveAfterRecordingRef.current = false;
          console.warn(error);
          setLastMatch('Scan recording failed to start.');
        },
      });
    } catch (error) {
      recordingRef.current = false;
      console.warn(error);
      setLastMatch('Scan recording failed to start.');
    }
  }, [handleRecordingFinished]);

  useEffect(() => {
    if (!scanning || attendanceSessionId == null || !cameraRef.current || recordingRef.current || !cameraReady) {
      return;
    }

    void startRecordingIfNeeded();
  }, [attendanceSessionId, cameraReady, scanning, startRecordingIfNeeded]);

  const closeAttendanceSessionIfNeeded = useCallback(async () => {
    if (attendanceSessionId == null) {
      return;
    }

    try {
      await stopAttendanceSession(attendanceSessionId);
    } catch (error) {
      console.warn(error);
    } finally {
      setAttendanceSessionId(null);
    }
  }, [attendanceSessionId]);

  const resetScanState = useCallback((message: string = READY_MESSAGE) => {
    setScanning(false);
    setAttendanceSessionId(null);
    setFilter('all');
    setLastMatch(message);
  }, []);

  const clearSectionSelection = useCallback((message: string = READY_MESSAGE) => {
    setStudents([]);
    setSelectedSection(null);
    resetScanState(message);
  }, [resetScanState]);

  const clearClassroomSelection = useCallback((message: string = READY_MESSAGE) => {
    setSections([]);
    setSelectedClassroom(null);
    clearSectionSelection(message);
  }, [clearSectionSelection]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedSection) {
        void stopRecordingIfNeeded(false);
        void closeAttendanceSessionIfNeeded();
        clearSectionSelection();
        return true;
      }

      if (selectedClassroom) {
        void stopRecordingIfNeeded(false);
        void closeAttendanceSessionIfNeeded();
        clearClassroomSelection();
        return true;
      }

      router.replace('/');
      return true;

    });

    return () => sub.remove();
  }, [
    clearClassroomSelection,
    clearSectionSelection,
    closeAttendanceSessionIfNeeded,
    selectedClassroom,
    selectedSection,
    stopRecordingIfNeeded,
  ]);

  useEffect(() => {
    return () => {
      void stopRecordingIfNeeded(false);
      void closeAttendanceSessionIfNeeded();
    };
  }, [closeAttendanceSessionIfNeeded, stopRecordingIfNeeded]);

  // Load classrooms
  useEffect(() => {
    const loadClassrooms = async () => {
      try {
        setLoadingClassrooms(true);
        setClassrooms(await fetchClassrooms());
      } catch (e) {
        console.warn('Failed loading classrooms', e);
        setLastMatch('Unable to load classrooms.');
      } finally {
        setLoadingClassrooms(false);
      }
    };

    loadClassrooms();
  }, []);

  const loadSectionsForClassroom = useCallback(async (room: Classroom) => {
    try {
      resetScanState('Loading sections...');
      setSelectedClassroom(room);
      setSelectedSection(null);
      setStudents([]);
      setSections([]);
      setLoadingSections(true);
      setSections(await fetchSections(room.id));
      setLastMatch(READY_MESSAGE);
    } catch (error) {
      console.warn('Failed loading sections', error);
      setLastMatch('Unable to load sections.');
    } finally {
      setLoadingSections(false);
    }
  }, [resetScanState]);

  const loadStudentsForSection = useCallback(async (section: Section) => {
    try {
      resetScanState('Loading students...');
      setSelectedSection(section);
      setStudents([]);
      setLoadingStudents(true);
      const studentList = await fetchStudents(section.id);
      setStudents(updateAllStudentStatuses(studentList as Student[], 'absent'));
      setLastMatch(READY_MESSAGE);
    } catch (error) {
      console.warn('Failed loading students', error);
      setLastMatch('Unable to load students.');
    } finally {
      setLoadingStudents(false);
    }
  }, [resetScanState]);

  const startScan = async () => {
    if (!selectedClassroom || !selectedSection) {
      return Alert.alert('Select section', 'Please select a section first.');
    }

    if (!studentsRef.current.length || loadingStudents) {
      return Alert.alert('Students loading', 'Wait for the student list to finish loading.');
    }

    const granted = hasPermission || (await requestPermission());

    if (!granted) {
      return Alert.alert('Permission', 'Camera permission required.');
    }

    try {
      setStudents((prev) => updateAllStudentStatuses(prev, 'pending'));
      setFilter('all');
      setLastMatch('Starting attendance session...');

      const session = await startAttendanceSession(selectedClassroom.id, selectedSection.id);
      setAttendanceSessionId(session.attendance_id);
      setScanning(true);
      setLastMatch('Scanning started. Capturing frames...');
    } catch (error) {
      setStudents((prev) => updateAllStudentStatuses(prev, 'absent'));
      resetScanState(error instanceof Error ? error.message : 'Unable to start attendance session.');
      setLastMatch(error instanceof Error ? error.message : 'Unable to start attendance session.');
      return;
    }

    void getBackendStatus().catch(() => {
      setLastMatch('Scanning started, but the backend is currently unreachable.');
    });

  };

  const stopScan = async () => {
    setScanning(false);
    await stopRecordingIfNeeded(false);
    await closeAttendanceSessionIfNeeded();
    setStudents((prev) =>
      prev.map((s) =>
        s.status === 'pending'
          ? { ...s, status: 'absent' }
          : s
      )
    );
    setLastMatch(lastRecordingPath ? 'Scan stopped. Recording is ready to download.' : 'Scan stopped.');
  };

  const downloadRecording = async () => {
    if (scanning) {
      return Alert.alert('Stop scanning first', 'Stop scanning before downloading the recording.');
    }

    if (!lastRecordingPath) {
      return Alert.alert('No recording', 'Start and stop a scan first to save a recording.');
    }

    setSavingVideo(true);

    try {
      await saveRecordingToLibrary(lastRecordingPath);
      setLastMatch('Scan recording saved to your downloads.');
    } catch (error) {
      console.warn(error);
      setLastMatch(error instanceof Error ? error.message : 'Unable to save the scan recording.');
    } finally {
      setSavingVideo(false);
    }
  };

  const resetAttendance = useCallback(() => {
    resetScanState('Attendance reset. Ready to scan.');
    void stopRecordingIfNeeded(false);
    void closeAttendanceSessionIfNeeded();
    setStudents((prev) => updateAllStudentStatuses(prev, 'absent'));
  }, [closeAttendanceSessionIfNeeded, resetScanState, stopRecordingIfNeeded]);

  const captureAndRecognize = useCallback(async () => {
    if (!scanning || attendanceSessionId == null || !cameraRef.current || uploadingRef.current || !cameraReadyRef.current) return;

    try {
      uploadingRef.current = true;
      setUploading(true);
      const photo = await cameraRef.current.takePhoto();
      const data = await recognizeAttendancePhoto(photo.path, attendanceSessionId);

      if (!data.success) {
        setLastMatch(data.message);
        return;
      }

      const currentStudents = studentsRef.current;
      const matchedStudents = findMatchedStudents(currentStudents, data.recognized_people);

      if (!matchedStudents.size) {
        setLastMatch('Recognized face not found in this section.');
        return;
      }

      const matchedRolls = new Set(matchedStudents.keys());

      setStudents((prev) =>
        prev.map((student) =>
          matchedRolls.has(student.rollNo)
            ? { ...student, status: 'present' }
            : student
        )
      );

      setLastMatch(`Recognized ${Array.from(matchedStudents.values()).map((student) => student.name).join(', ')}.`);
    } catch (err) {
      console.warn(err);
      setLastMatch(err instanceof Error ? err.message : 'Recognition failed.');
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }, [attendanceSessionId, scanning]);

  useEffect(() => {

    if (!scanning) return;

    const interval = setInterval(() => {
      void captureAndRecognize();
    }, AUTO_SCAN_INTERVAL_MS);

    return () => clearInterval(interval);

  }, [captureAndRecognize, scanning]);

  const logout = async () => {
    await clearCurrentTeacher();
    router.replace('/');
  };

  return (

    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>

      <AppHeader
        title="FaceZoid"
        subtitle={selectedSection?.name ?? selectedClassroom?.name}
        topPadding={insets.top + 10}
      />

      {!selectedClassroom ? (

        <ScrollView contentContainerStyle={styles.page}>

          <View style={styles.welcomeRow}>
            <Text style={styles.pageTitle}>Welcome, {teacherName}</Text>

            <Pressable onPress={logout} style={styles.logoutButton}>
              <Feather name="log-out" size={18} color="#BFD6F3" />
            </Pressable>
          </View>

          <Text style={styles.sectionHeader}>SELECT CLASSROOM</Text>

          {loadingClassrooms ? (
            <Text style={styles.cardSub}>Loading classrooms...</Text>
          ) : null}

          {classrooms.map((room) => (
            <Pressable
              key={room.id}
              style={styles.card}
              onPress={async () => {
                setScanning(false);
                void stopRecordingIfNeeded(false);
                void closeAttendanceSessionIfNeeded();
                await loadSectionsForClassroom(room);
              }}
            >

              <View style={[styles.iconCard, { backgroundColor: '#1AA3E6' }]}>
                <Feather name="home" size={20} color="#092333" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{room.name}</Text>
                <Text style={styles.cardSub}>{room.location}</Text>
              </View>

              <Feather name="chevron-right" size={18} color="#94A3B8" />

            </Pressable>

          ))}

        </ScrollView>

      ) : !selectedSection ? (

        <ScrollView contentContainerStyle={styles.page}>

          <BackButton
            label="Back to Classrooms"
            onPress={() => {
              setScanning(false);
              void stopRecordingIfNeeded(false);
              void closeAttendanceSessionIfNeeded();
              clearClassroomSelection();
            }}
          />

          <Text style={styles.pageTitle}>Select Section</Text>

          {loadingSections ? (
            <Text style={styles.cardSub}>Loading sections...</Text>
          ) : null}

          {sections.map((section) => (
            <Pressable
              key={section.id}
              style={styles.card}
              onPress={async () => {
                setScanning(false);
                void stopRecordingIfNeeded(false);
                void closeAttendanceSessionIfNeeded();
                await loadStudentsForSection(section);
              }}
            >

              <View style={[styles.iconCard, { backgroundColor: '#34D7A0' }]}>
                <Feather name="book-open" size={20} color="#092333" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{section.name}</Text>
                <Text style={styles.cardSub}>{section.title}</Text>
              </View>

              <Feather name="chevron-right" size={18} color="#94A3B8" />

            </Pressable>

          ))}

        </ScrollView>

      ) : (

        <ScrollView contentContainerStyle={styles.page}>

          <BackButton
            label="Back to Sections"
            onPress={() => {
              setScanning(false);
              void stopRecordingIfNeeded(false);
              void closeAttendanceSessionIfNeeded();
              clearSectionSelection();
            }}
          />

          {/* CAMERA FEED */}

          <View style={styles.cameraView}>

            {scanning && device && hasPermission ? (

              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive
                photo
                video
                onInitialized={() => {
                  cameraReadyRef.current = true;
                  setCameraReady(true);
                }}
                onError={(error) => {
                  cameraReadyRef.current = false;
                  setCameraReady(false);
                  console.warn(error);
                  setLastMatch('Camera failed to initialize.');
                }}
              />

            ) : (

              <View style={styles.placeholder}>
                <Feather name="camera" size={38} color="#7D8CA3" />
                <Text style={styles.placeholderText}>
                  {scanning ? 'Preparing camera...' : 'Camera will open when scanning starts.'}
                </Text>
              </View>

            )}

          </View>

          <ScannerControls
            scanning={scanning}
            canDownload={!scanning && !savingVideo && !!lastRecordingPath}
            downloading={savingVideo}
            onPrimary={scanning ? stopScan : startScan}
            onDownload={downloadRecording}
            onSwitchCamera={() =>
              setCameraPosition((p) => (p === 'back' ? 'front' : 'back'))
            }
            onReset={resetAttendance}
          />

          <FilterPills
            total={total}
            present={present}
            absent={absent}
            filter={filter}
            onChange={setFilter}
          />

          <Text style={styles.cardSub}>{lastMatch}</Text>

          <Text style={styles.sectionHeader}>
            STUDENTS ({filteredStudents.length})
          </Text>

          {filteredStudents.map((student) => (
            <StudentCard key={student.rollNo} student={student} />
          ))}

        </ScrollView>

      )}

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: '#050C1E' },

  page: { paddingHorizontal: 16, paddingTop: 10 },

  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#162748'
  },

  pageTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6
  },

  sectionHeader: {
    color: '#93A5C2',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 10
  },

  card: {
    backgroundColor: '#121C34',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
    gap: 12
  },

  iconCard: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },

  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700'
  },

  cardSub: {
    color: '#97A7C0',
    fontSize: 12
  },

  cameraView: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1D2946',
    marginBottom: 12
  },

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  placeholderText: {
    color: '#94A3B8'
  }

});
