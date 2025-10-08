'use client';

import { useState, useEffect, memo } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import LoadingSpinner from './LoadingSpinner';

interface Staff {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
}

interface Schedule {
    id: string;
    staffId: string;
    staffName: string;
    date: Date;
    shift: 'morning' | 'afternoon' | 'night';
    startTime: string;
    endTime: string;
    tasks: string[];
    status: 'scheduled' | 'completed' | 'absent';
}

interface Task {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    assignedTo: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed';
}

const StaffSchedulePage = () => {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'staff' | 'schedule' | 'tasks'>('schedule');
    const [selectedWeek, setSelectedWeek] = useState(new Date());

    // Modals
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Forms
    const [staffForm, setStaffForm] = useState({
        name: '', role: '', phone: '', email: '', status: 'active' as const
    });
    const [scheduleForm, setScheduleForm] = useState({
        staffId: '', date: '', shift: 'morning' as const, startTime: '', endTime: '', tasks: [] as string[]
    });
    const [taskForm, setTaskForm] = useState({
        title: '', description: '', priority: 'medium' as const, assignedTo: '', dueDate: '', status: 'pending' as const
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Récupérer le personnel
            const staffSnapshot = await getDocs(collection(db, 'staff'));
            const staffData = staffSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Staff[];

            // Récupérer les horaires
            const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
            const schedulesData = schedulesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            })) as Schedule[];

            // Récupérer les tâches
            const tasksSnapshot = await getDocs(collection(db, 'tasks'));
            const tasksData = tasksSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate?.toDate()
            })) as Task[];

            setStaff(staffData);
            setSchedules(schedulesData);
            setTasks(tasksData);
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async () => {
        try {
            await addDoc(collection(db, 'staff'), staffForm);
            setStaffForm({ name: '', role: '', phone: '', email: '', status: 'active' });
            setShowStaffModal(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
        }
    };

    const handleAddSchedule = async () => {
        try {
            const selectedStaff = staff.find(s => s.id === scheduleForm.staffId);
            await addDoc(collection(db, 'schedules'), {
                ...scheduleForm,
                staffName: selectedStaff?.name || '',
                date: Timestamp.fromDate(new Date(scheduleForm.date)),
                status: 'scheduled'
            });
            setScheduleForm({ staffId: '', date: '', shift: 'morning', startTime: '', endTime: '', tasks: [] });
            setShowScheduleModal(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
        }
    };

    const handleAddTask = async () => {
        try {
            const selectedStaff = staff.find(s => s.id === taskForm.assignedTo);
            await addDoc(collection(db, 'tasks'), {
                ...taskForm,
                assignedTo: selectedStaff?.name || '',
                dueDate: Timestamp.fromDate(new Date(taskForm.dueDate))
            });
            setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '', status: 'pending' });
            setShowTaskModal(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
        }
    };

    const getWeekDays = (date: Date) => {
        const week = [];
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Lundi

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            week.push(day);
        }
        return week;
    };

    const getScheduleForDay = (date: Date, staffId: string) => {
        return schedules.find(s => 
            s.staffId === staffId && 
            s.date.toDateString() === date.toDateString()
        );
    };

    const getShiftColor = (shift: string) => {
        switch (shift) {
            case 'morning': return 'bg-yellow-100 text-yellow-800';
            case 'afternoon': return 'bg-blue-100 text-blue-800';
            case 'night': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Planning du Personnel</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'staff' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        Personnel
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'schedule' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        Horaires
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'tasks' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        Tâches
                    </button>
                </div>
            </div>

            {/* Onglet Personnel */}
            {activeTab === 'staff' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-800">Liste du Personnel</h2>
                        <button
                            onClick={() => setShowStaffModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Ajouter Personnel
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staff.map((member) => (
                            <div key={member.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-slate-800">{member.name}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        member.status === 'active' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {member.status === 'active' ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <p><span className="font-medium">Poste:</span> {member.role}</p>
                                    <p><span className="font-medium">Téléphone:</span> {member.phone}</p>
                                    <p><span className="font-medium">Email:</span> {member.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Onglet Horaires */}
            {activeTab === 'schedule' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-800">Planning Hebdomadaire</h2>
                        <div className="flex gap-2">
                            <input
                                type="week"
                                value={selectedWeek.toISOString().slice(0, 10)}
                                onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                                className="px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Planifier
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Personnel</th>
                                    {getWeekDays(selectedWeek).map((day, index) => (
                                        <th key={`day-${index}`} className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                                            <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                                            <div className="text-xs text-slate-500">{day.getDate()}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {staff.map((member) => (
                                    <tr key={member.id}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="font-medium text-slate-800">{member.name}</div>
                                                <div className="text-sm text-slate-500">{member.role}</div>
                                            </div>
                                        </td>
                                        {getWeekDays(selectedWeek).map((day, dayIndex) => {
                                            const schedule = getScheduleForDay(day, member.id);
                                            return (
                                                <td key={`schedule-${member.id}-${dayIndex}`} className="px-4 py-3 text-center">
                                                    {schedule ? (
                                                        <div className={`px-2 py-1 rounded text-xs font-medium ${getShiftColor(schedule.shift)}`}>
                                                            <div>{schedule.shift === 'morning' ? 'Matin' : schedule.shift === 'afternoon' ? 'Après-midi' : 'Nuit'}</div>
                                                            <div className="text-xs">{schedule.startTime}-{schedule.endTime}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">Repos</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Onglet Tâches */}
            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-800">Gestion des Tâches</h2>
                        <button
                            onClick={() => setShowTaskModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Nouvelle Tâche
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {['pending', 'in-progress', 'completed'].map((status) => (
                            <div key={status} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-4 border-b border-slate-200">
                                    <h3 className="font-semibold text-slate-800">
                                        {status === 'pending' ? 'À faire' : status === 'in-progress' ? 'En cours' : 'Terminées'}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {tasks.filter(t => t.status === status).length} tâche(s)
                                    </p>
                                </div>
                                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                    {tasks.filter(t => t.status === status).map((task) => (
                                        <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-slate-800 text-sm">{task.title}</h4>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                    {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2">{task.description}</p>
                                            <div className="flex justify-between items-center text-xs text-slate-500">
                                                <span>{task.assignedTo}</span>
                                                <span>{task.dueDate.toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showStaffModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Ajouter Personnel</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom complet"
                                value={staffForm.name}
                                onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Poste"
                                value={staffForm.role}
                                onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <input
                                type="tel"
                                placeholder="Téléphone"
                                value={staffForm.phone}
                                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={staffForm.email}
                                onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowStaffModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddStaff}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Planifier Horaire</h3>
                        <div className="space-y-4">
                            <select
                                value={scheduleForm.staffId}
                                onChange={(e) => setScheduleForm({...scheduleForm, staffId: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            >
                                <option value="">Sélectionner personnel</option>
                                {staff.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={scheduleForm.date}
                                onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <select
                                value={scheduleForm.shift}
                                onChange={(e) => setScheduleForm({...scheduleForm, shift: e.target.value as any})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            >
                                <option value="morning">Matin</option>
                                <option value="afternoon">Après-midi</option>
                                <option value="night">Nuit</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    placeholder="Heure début"
                                    value={scheduleForm.startTime}
                                    onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                                    className="px-3 py-2 border border-slate-300 rounded-lg"
                                />
                                <input
                                    type="time"
                                    placeholder="Heure fin"
                                    value={scheduleForm.endTime}
                                    onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                                    className="px-3 py-2 border border-slate-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddSchedule}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Planifier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTaskModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Nouvelle Tâche</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Titre de la tâche"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Description"
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg h-20"
                            />
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({...taskForm, priority: e.target.value as any})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            >
                                <option value="low">Priorité basse</option>
                                <option value="medium">Priorité moyenne</option>
                                <option value="high">Priorité haute</option>
                            </select>
                            <select
                                value={taskForm.assignedTo}
                                onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            >
                                <option value="">Assigner à</option>
                                {staff.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowTaskModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddTask}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(StaffSchedulePage);