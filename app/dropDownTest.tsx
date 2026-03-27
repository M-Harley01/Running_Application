  import React, { useState } from 'react';
  import { StyleSheet, Text, View } from 'react-native';
  import { Dropdown } from 'react-native-element-dropdown';
  import AntDesign from '@expo/vector-icons/AntDesign';
  import { Link, useRouter, useLocalSearchParams } from 'expo-router'

  type DropdownProps = {
    id?: string | string[];
    loginLat?: string | string[];
    loginLon?: string | string[];
  }

  const data = [
    { label: 'Plan a run', value: 'map' },
    { label: 'View previous runs', value: 'listRuns' },
    { label: 'Load route', value: 'loadRoute' },
  ];

  const DropdownComponent = ({ id, loginLat, loginLon }: DropdownProps) => {
  const router = useRouter();
  const [value, setValue] = useState<string | null>(null);
  const [isFocus, setIsFocus] = useState(false);

  const handleNavigation = (selectedValue: string) => {
    if (selectedValue === 'map') {
      router.push({
        pathname: '/map',
        params: { id: String(id) },
      });
      return;
    }

    if (selectedValue === 'listRuns') {
      router.push({
        pathname: '/listRuns',
        params: { id: String(id) },
      });
      return;
    }

    if (selectedValue === 'loadRoute') {
      router.push({
        pathname: '/loadRoute',
        params: {
          id: String(id),
          loginLat: String(loginLat),
          loginLon: String(loginLon),
        },
      });
      return;
    }
  };

  return (
    <View style={styles.container}>
      <Dropdown
        style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        iconStyle={styles.iconStyle}
        data={data}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={!isFocus ? 'Select item' : '...'}
        value={value}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={(item) => {
          setValue(item.value);
          setIsFocus(false);
          handleNavigation(item.value);
        }}
        renderLeftIcon={() => (
          <AntDesign
            style={styles.icon}
            color={isFocus ? 'blue' : 'black'}
            name="down"
            size={20}
          />
        )}
      />
    </View>
  );
};

  export default DropdownComponent;

  const styles = StyleSheet.create({
    container: {
  
    },
    dropdown: {
      height: 50,
      width: 150,
      borderColor: 'gray',
      borderWidth: 0.5,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    icon: {
      marginRight: 5,
    },
    label: {
      position: 'absolute',
      backgroundColor: 'white',
      left: 22,
      top: 8,
      zIndex: 999,
      paddingHorizontal: 8,
      fontSize: 14,
    },
    placeholderStyle: {
      fontSize: 16,
    },
    selectedTextStyle: {
      fontSize: 16,
    },
    iconStyle: {
      width: 20,
      height: 20,
    },
    inputSearchStyle: {
      height: 40,
      fontSize: 16,
    },
  });